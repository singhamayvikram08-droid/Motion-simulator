import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import path, { join } from "path";
import { fileURLToPath } from "url";
import { createServer } from 'http';
import { Server } from 'socket.io';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import fs from 'fs';
import multer from 'multer';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const server = createServer(app);

// Setup Socket.io with CORS
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for local dev
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// File uploads setup
const uploadsDir = join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = file.originalname.split('.').pop();
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Initialize SQLite Database
const dbDir = join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}
const dbPath = join(dbDir, 'snackdash.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Orders Table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      userId TEXT,
      customerName TEXT,
      phone TEXT,
      items TEXT,
      total REAL,
      status TEXT DEFAULT 'Preparing',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

        // Add userId column defensively if it doesn't exist (migrations)
        db.run(`ALTER TABLE orders ADD COLUMN userId TEXT`, (err) => {
            // Ignore 'duplicate column name' errors if it already exists
        });

        // Migration: normalize statuses to 'Preparing' for active orders
        db.run(`UPDATE orders SET status = 'Preparing' WHERE status IN ('Pending', 'Confirmed')`, (err) => {
            if (err) console.error('Migration error (status normalization):', err.message);
        });

        // Messages Table
        db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId TEXT,
      sender TEXT, /* 'customer' or 'admin' */
      text TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(orderId) REFERENCES orders(id)
    )`);

        // Feedback Table
        db.run(`CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT,
      type TEXT,
      content TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

        // Inventory Table (with stock quantities)
        db.run(`CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'in',
      stock_count INTEGER DEFAULT 0,
      sold_count INTEGER DEFAULT 0
    )`, () => {
            // Migration: add columns if they don't exist (for existing databases)
            db.run(`ALTER TABLE inventory ADD COLUMN stock_count INTEGER DEFAULT 0`, () => { });
            db.run(`ALTER TABLE inventory ADD COLUMN sold_count INTEGER DEFAULT 0`, () => { });
        });
    });
}

// --- REST API ENDPOINTS ---

// Get Inventory (returns full quantity data)
app.get('/api/inventory', (req, res) => {
    db.all('SELECT * FROM inventory', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const inventoryMap = {};
        rows.forEach(r => {
            inventoryMap[r.id] = {
                status: r.status,
                stock_count: r.stock_count || 0,
                sold_count: r.sold_count || 0
            };
        });
        res.json(inventoryMap);
    });
});

// Toggle Item Stock (backward compat)
app.post('/api/inventory/toggle', (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Item ID required' });

    db.get('SELECT status FROM inventory WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        const newStatus = row ? (row.status === 'in' ? 'out' : 'in') : 'out';

        db.run(
            'INSERT INTO inventory (id, status) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET status = ?',
            [id, newStatus, newStatus],
            function (updateErr) {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                io.emit('inventory_updated', { id, status: newStatus });
                res.json({ success: true, id, status: newStatus });
            }
        );
    });
});

// Update Item Stock & Sold Counts (Scanner use)
app.post('/api/inventory/update', (req, res) => {
    const { id, stock_count, sold_count } = req.body;
    if (!id) return res.status(400).json({ error: 'Item ID required' });

    const sc = parseInt(stock_count) || 0;
    const sd = parseInt(sold_count) || 0;
    const status = sc > 0 ? 'in' : 'out';

    db.run(
        `INSERT INTO inventory (id, status, stock_count, sold_count) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET status = ?, stock_count = ?, sold_count = ?`,
        [id, status, sc, sd, status, sc, sd],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            io.emit('inventory_updated', { id, status, stock_count: sc, sold_count: sd });
            res.json({ success: true, id, status, stock_count: sc, sold_count: sd });
        }
    );
});

// Add new product
app.post('/api/products/add', upload.single('photo'), (req, res) => {
    const { name, type, price } = req.body;
    if (!name || !type || !price) return res.status(400).json({ error: 'Name, type, and price are required' });

    const id = name.toLowerCase().replace(/\s+/g, '-');
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Add to inventory table
    db.run(
        'INSERT OR REPLACE INTO inventory (id, status, stock_count, sold_count) VALUES (?, ?, ?, ?)',
        [id, 'in', 10, 0],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            io.emit('product_added', { id, name, type, price: Number(price), photoUrl });
            res.json({ success: true, product: { id, name, type, price: Number(price), photoUrl } });
        }
    );
});

// Get all products
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM inventory', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Upload photo for chat
app.post('/api/chat/upload', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });
    const photoUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, photoUrl, fullUrl: `http://localhost:3000${photoUrl}` });
});

// AI Chatbot Endpoint (uses OpenRouter REST API)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
function getOrders() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM orders ORDER BY createdAt DESC', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

// Helper: get inventory from DB
function getInventory() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM inventory', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

app.post('/api/chat/ai', async (req, res) => {
    const { message, history, role } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    // Detect "connect to customer" command
    const connectMatch = message.match(/connect\s+(?:to\s+)?(?:customer|coustomer|coustmer)\s*(.*)/i);
    if (connectMatch && (role === 'scanner' || role === 'admin')) {
        let orderId = connectMatch[1].trim().toUpperCase();
        if (orderId && !orderId.startsWith('ORD-')) orderId = 'ORD-' + orderId;
        if (orderId) {
            return res.json({
                success: true,
                reply: `Connecting you to customer for order ${orderId}...`,
                action: 'connect_to_customer',
                orderId: orderId
            });
        } else {
            return res.json({
                success: true,
                reply: 'Please provide an order ID. Example: "connect to customer ORD-ABC123"'
            });
        }
    }

    try {
        // Build role-specific system prompt with live data
        let systemPrompt = `You are SnackBot, a friendly and helpful AI assistant for SnackDash – a premium snack ordering service designed and created by Amay Vikram Singh (CEO & Designer).

Menu: Maggi ₹25, Yippee ₹25, Cheese Macaroni ₹50, Masala Penne ₹50, Mushroom Penne ₹50, Dark Fantasy ₹15, Madangles S ₹35, Madangles L ₹70.
Delivery time: 5-10 minutes.`;

        if (role === 'admin' || role === 'scanner') {
            // Fetch live data for staff
            const [orders, inventory] = await Promise.all([getOrders(), getInventory()]);

            const orderSummary = orders.length > 0
                ? orders.slice(0, 20).map(o => `${o.id}: ${o.customerName || 'Guest'}, ${o.status}, ₹${o.total}, items: ${o.items}`).join('\n')
                : 'No orders yet.';

            const invSummary = inventory.length > 0
                ? inventory.map(i => `${i.id}: stock=${i.stock_count || 0}, sold=${i.sold_count || 0}, status=${i.status}`).join(', ')
                : 'No inventory data.';

            const totalOrders = orders.length;
            const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
            const pendingOrders = orders.filter(o => o.status === 'Pending').length;
            const completedOrders = orders.filter(o => o.status === 'Completed').length;

            systemPrompt += `

You are assisting a ${role === 'admin' ? 'Admin' : 'Scanner Staff'} member. You have FULL access to live system data. Answer any question about orders, inventory, analytics, or business operations accurately.

LIVE ORDERS (${totalOrders} total, ₹${totalRevenue} revenue, ${pendingOrders} pending, ${completedOrders} completed):
${orderSummary}

LIVE INVENTORY:
${invSummary}

You can help staff with: checking order details, inventory levels, revenue analytics, customer info, and any operational questions. Be direct and data-driven. If a staff member asks to connect to a customer, tell them to type: "connect to customer ORDER_ID"`;
        } else {
            systemPrompt += `
You help customers with menu info, order status, delivery time, and recommendations. Keep responses short and friendly.
If asked who made SnackDash, credit Amay Vikram Singh as CEO & Designer.`;
        }

        const messages = [
            { role: 'system', content: systemPrompt },
            ...(history || []).slice(-6).map(m => ({
                role: m.sender === 'customer' ? 'user' : 'assistant',
                content: m.text
            })),
            { role: 'user', content: message }
        ];

        const apiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://snackdash.onrender.com',
                'X-Title': 'SnackDash'
            },
            body: JSON.stringify({
                model: 'arcee-ai/trinity-large-preview:free',
                messages,
                temperature: 0.7
            })
        });

        const data = await apiRes.json();

        if (!apiRes.ok) {
            console.error('OpenRouter Error:', apiRes.status, data);
            if (apiRes.status === 401) {
                return res.json({ success: true, reply: 'My brain is offline. The OpenRouter API key has expired or is invalid. Please update OPENROUTER_API_KEY in the server!' });
            }
            throw new Error(data.error?.message || 'Failed to get AI response');
        }

        console.log("OpenRouter Response Data:", JSON.stringify(data, null, 2));
        const reply = data.choices?.[0]?.message?.content || 'Sorry, I couldn\'t process that. Please try again!';
        res.json({ success: true, reply });
    } catch (err) {
        console.error('AI chat error:', err.message);
        res.json({ success: true, reply: `I'm having trouble connecting to my AI brain. Error: ${err.message}` });
    }
});


app.get('/api/orders', (req, res) => {
    db.all('SELECT * FROM orders ORDER BY createdAt DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // parse items JSON robustly
        const orders = rows.map(r => {
            let parsedItems = [];
            try {
                parsedItems = JSON.parse(r.items || '[]');
            } catch (e) {
                console.error(`Error parsing items for order ${r.id}:`, e);
            }
            return { ...r, items: parsedItems };
        });
        res.json(orders);
    });
});

// Update order status
app.patch('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Emit real-time update
        io.emit('order_status_update', { id, status });
        res.json({ success: true, id, status });
    });
});

// Broadcast Maintenance State
app.post('/api/maintenance', (req, res) => {
    const { type, isLocked } = req.body;
    // type is 'customer' or 'order'
    io.emit('maintenance_update', { type, isLocked });
    res.json({ success: true, type, isLocked });
});

// Get messages for an order
app.get('/api/orders/:id/messages', (req, res) => {
    const { id } = req.params;
    db.all('SELECT * FROM messages WHERE orderId = ? ORDER BY createdAt ASC', [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});


// Get single order details
app.get('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM orders WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Order not found' });

        let parsedItems = [];
        try { parsedItems = JSON.parse(row.items); } catch (e) { }
        const order = { ...row, items: parsedItems };
        res.json(order);
    });
});

// Get all orders for a specific user
app.get('/api/users/:userId/orders', (req, res) => {
    const { userId } = req.params;
    db.all('SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC', [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const orders = rows.map(r => {
            let parsedItems = [];
            try { parsedItems = JSON.parse(r.items); } catch (e) { }
            return { ...r, items: parsedItems };
        });
        res.json(orders);
    });
});

// --- FEEDBACK ENDPOINTS ---

// Submit new feedback
app.post('/api/feedback', (req, res) => {
    const { sender, type, content } = req.body;
    db.run(
        `INSERT INTO feedback (sender, type, content) VALUES (?, ?, ?)`,
        [sender || 'Anonymous', type, content],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Emit to admin(s)
            io.emit('new_feedback', {
                id: this.lastID,
                sender: sender || 'Anonymous',
                type,
                content,
                createdAt: new Date().toISOString()
            });

            res.json({ success: true, id: this.lastID });
        }
    );
});

// Get all feedback for admin dashboard
app.get('/api/feedback', (req, res) => {
    db.all('SELECT * FROM feedback ORDER BY createdAt DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- SOCKET.IO REAL-TIME LOGIC ---

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Client joins a specific order room
    socket.on('join_order_room', (orderId) => {
        socket.join(orderId);
        console.log(`Socket ${socket.id} joined room: ${orderId}`);
    });

    // Client creates a new order
    socket.on('place_order', (orderData, callback) => {
        const { id, userId, customerName, phone, items, total } = orderData;

        // Validate: only allow menu items
        const VALID_MENU_IDS = ['maggi', 'yippee', 'pasta-cheese', 'pasta-masala', 'pasta-mushroom', 'dark-fantasy', 'madangles-s', 'madangles-l'];
        const invalidItems = (items || []).filter(item => !VALID_MENU_IDS.includes(item.id));
        if (invalidItems.length > 0) {
            const names = invalidItems.map(i => i.name || i.id).join(', ');
            if (callback) callback({ success: false, error: `Item not available in menu: ${names}` });
            return;
        }

        const itemsJson = JSON.stringify(items);

        db.run(
            `INSERT INTO orders (id, userId, customerName, phone, items, total, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'Preparing')`,
            [id, userId || 'GUEST', customerName, phone, itemsJson, total],
            function (err) {
                if (err) {
                    console.error('Error saving order:', err);
                    if (callback) callback({ success: false, error: err.message });
                    return;
                }

                // Notify admins of new order
                io.emit('new_order', { ...orderData, status: 'Preparing', createdAt: new Date().toISOString() });
                if (callback) callback({ success: true, id });
            }
        );
    });

    // Client sends a chat message
    socket.on('send_message', (msgData, callback) => {
        const { orderId, sender, text } = msgData;

        db.run(
            `INSERT INTO messages (orderId, sender, text) VALUES (?, ?, ?)`,
            [orderId, sender, text],
            function (err) {
                if (err) {
                    console.error('Error saving message:', err);
                    if (callback) callback({ success: false, error: err.message });
                    return;
                }

                const storedMsg = {
                    id: this.lastID,
                    orderId,
                    sender,
                    text,
                    createdAt: new Date().toISOString()
                };

                // Broadcast to everyone in the order room (customer + admin)
                io.to(orderId).emit('new_message', storedMsg);

                // Also broadcast globally so admin dashboard can update unread counters
                io.emit('global_new_message', storedMsg);

                if (callback) callback({ success: true, message: storedMsg });
            }
        );
    });

    // Staff direct chat (admin <-> scanner via code 1278)
    socket.on('join_staff_chat', (role) => {
        socket.join('STAFF-DIRECT');
        console.log(`${role} (${socket.id}) joined staff chat`);
        io.to('STAFF-DIRECT').emit('staff_system', { text: `${role} joined the staff chat`, role });
    });

    socket.on('staff_message', (data) => {
        const msg = {
            sender: data.sender, // 'admin' or 'scanner'
            text: data.text,
            createdAt: new Date().toISOString()
        };
        // Broadcast to all in STAFF-DIRECT room
        io.to('STAFF-DIRECT').emit('staff_new_message', msg);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Serve Vite build folder
app.use(express.static(path.join(__dirname, "dist")));

// Send index.html for all unknown routes (Express 5 compatible wildcard)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server running on port " + PORT + " with Socket.io enabled.");
});
