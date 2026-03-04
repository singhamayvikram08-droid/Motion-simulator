import { io } from 'socket.io-client';

export const socket = io('');

socket.on('connect', () => {
  console.log('[Socket] Connected! ID:', socket.id);
  showToast('Live connection established', 'success');
});

socket.on('connect_error', (err) => {
  console.error('[Socket] Connection Failed:', err.message);
  showToast('Chat link unstable. Retrying...', 'error');
});

socket.on('disconnect', (reason) => {
  console.warn('[Socket] Disconnected:', reason);
  if (reason === 'io server disconnect') socket.connect();
});

// --- UNIFIED AUTHENTICATION GATEWAY ---
const authForm = document.getElementById('authForm') as HTMLFormElement;
if (authForm) {
  const toggleLoginBtn = document.getElementById('toggleLoginBtn');
  const toggleSignupBtn = document.getElementById('toggleSignupBtn');
  const customerAuthToggle = document.getElementById('customerAuthToggle');
  const nameGroup = document.getElementById('nameGroup');
  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authNameInput = document.getElementById('authName') as HTMLInputElement;
  const roleTabs = document.querySelectorAll('.role-tab');

  let isSignUp = false;
  let activeRole = 'customer'; // 'customer' | 'admin' | 'scanner'

  // --- ROLE TAB SWITCHING ---
  const ADMIN_SCANNER_EMAIL = 'singhamayvikram08@gmail.com';
  const ADMIN_SCANNER_PASS = '727265';

  function switchRole(role: string) {
    activeRole = role;
    roleTabs.forEach(t => {
      const el = t as HTMLElement;
      if (el.dataset.role === role) {
        el.classList.add('active-role');
        el.style.background = 'var(--primary)';
        el.style.color = 'white';
      } else {
        el.classList.remove('active-role');
        el.style.background = 'transparent';
        el.style.color = 'var(--text-dim)';
      }
    });

    if (role === 'customer') {
      if (customerAuthToggle) customerAuthToggle.style.display = 'flex';
      if (nameGroup) nameGroup.style.display = isSignUp ? 'block' : 'none';
      if (authTitle) authTitle.textContent = isSignUp ? 'Create Account' : 'Customer Login';
      if (authSubtitle) authSubtitle.textContent = 'Log in to satisfy your cravings.';
      if (authSubmitBtn) authSubmitBtn.textContent = isSignUp ? 'Sign Up' : 'Log In';
    } else if (role === 'admin') {
      isSignUp = false;
      if (customerAuthToggle) customerAuthToggle.style.display = 'none';
      if (nameGroup) nameGroup.style.display = 'none';
      if (authNameInput) authNameInput.required = false;
      if (authTitle) authTitle.textContent = '🔧 Admin Access';
      if (authSubtitle) authSubtitle.textContent = 'Enter your admin credentials.';
      if (authSubmitBtn) authSubmitBtn.textContent = 'Unlock Admin';
    } else if (role === 'scanner') {
      isSignUp = false;
      if (customerAuthToggle) customerAuthToggle.style.display = 'none';
      if (nameGroup) nameGroup.style.display = 'none';
      if (authNameInput) authNameInput.required = false;
      if (authTitle) authTitle.textContent = '📦 Scanner Access';
      if (authSubtitle) authSubtitle.textContent = 'Enter your scanner credentials.';
      if (authSubmitBtn) authSubmitBtn.textContent = 'Unlock Scanner';
    }
  }

  roleTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchRole((tab as HTMLElement).dataset.role || 'customer');
    });
  });

  // --- CUSTOMER LOGIN / SIGNUP TOGGLE ---
  const switchToLogin = () => {
    isSignUp = false;
    if (nameGroup) nameGroup.style.display = 'none';
    if (authNameInput) authNameInput.required = false;
    if (authTitle) authTitle.textContent = 'Customer Login';
    if (authSubtitle) authSubtitle.textContent = 'Log in to satisfy your cravings.';
    if (authSubmitBtn) authSubmitBtn.textContent = 'Log In';

    if (toggleLoginBtn) {
      toggleLoginBtn.style.background = 'var(--primary)';
      toggleLoginBtn.style.color = 'white';
    }
    if (toggleSignupBtn) {
      toggleSignupBtn.style.background = 'transparent';
      toggleSignupBtn.style.color = 'var(--text-dim)';
    }
  };

  const switchToSignup = () => {
    isSignUp = true;
    if (nameGroup) nameGroup.style.display = 'block';
    if (authNameInput) authNameInput.required = true;
    if (authTitle) authTitle.textContent = 'Create Account';
    if (authSubtitle) authSubtitle.textContent = 'Join SnackDash for ultimate midnight snacking.';
    if (authSubmitBtn) authSubmitBtn.textContent = 'Sign Up';

    if (toggleSignupBtn) {
      toggleSignupBtn.style.background = 'var(--primary)';
      toggleSignupBtn.style.color = 'white';
    }
    if (toggleLoginBtn) {
      toggleLoginBtn.style.background = 'transparent';
      toggleLoginBtn.style.color = 'var(--text-dim)';
    }
  };

  toggleLoginBtn?.addEventListener('click', switchToLogin);
  toggleSignupBtn?.addEventListener('click', switchToSignup);

  // --- FORM SUBMISSION ---
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (document.getElementById('authEmail') as HTMLInputElement).value.trim();
    const password = (document.getElementById('authPassword') as HTMLInputElement).value.trim();
    const name = authNameInput ? authNameInput.value.trim() : '';

    if (authSubmitBtn) authSubmitBtn.textContent = 'Authenticating...';

    try {
      if (activeRole === 'admin') {
        // Hardcoded Admin Login
        if (email === ADMIN_SCANNER_EMAIL && password === ADMIN_SCANNER_PASS) {
          localStorage.setItem('snackdash_admin_session', 'true');
          showToast('Admin Unlocked!', 'success');
          setTimeout(() => window.location.href = 'admin.html', 800);
        } else {
          showToast('Invalid Admin credentials.', 'error');
          if (authSubmitBtn) authSubmitBtn.textContent = 'Unlock Admin';
        }
        return;
      }

      if (activeRole === 'scanner') {
        // Hardcoded Scanner Login
        if (email === ADMIN_SCANNER_EMAIL && password === ADMIN_SCANNER_PASS) {
          localStorage.setItem('snackdash_scanner_session', 'true');
          showToast('Scanner Unlocked!', 'success');
          setTimeout(() => window.location.href = 'scanner.html', 800);
        } else {
          showToast('Invalid Scanner credentials.', 'error');
          if (authSubmitBtn) authSubmitBtn.textContent = 'Unlock Scanner';
        }
        return;
      }

      // Customer Login / Sign Up
      if (isSignUp) {
        const existingUsersRaw = localStorage.getItem('snackdash_users');
        const existingUsers = existingUsersRaw ? JSON.parse(existingUsersRaw) : [];
        if (existingUsers.find((u: any) => u.email === email)) {
          showToast('Email already exists. Please log in.', 'error');
          if (authSubmitBtn) authSubmitBtn.textContent = 'Sign Up';
          return;
        }

        const newUser = {
          id: 'USR-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          name,
          email,
          password
        };
        existingUsers.push(newUser);
        localStorage.setItem('snackdash_users', JSON.stringify(existingUsers));
        localStorage.setItem('snackdash_session', JSON.stringify(newUser));
        showToast('Account created successfully!', 'success');
        setTimeout(() => window.location.href = 'menu.html', 800);
      } else {
        const existingUsersRaw = localStorage.getItem('snackdash_users');
        const existingUsers = existingUsersRaw ? JSON.parse(existingUsersRaw) : [];
        const user = existingUsers.find((u: any) => u.email === email && u.password === password);

        if (user) {
          localStorage.setItem('snackdash_session', JSON.stringify(user));
          showToast('Welcome back!', 'success');
          setTimeout(() => window.location.href = 'menu.html', 800);
        } else {
          showToast('Invalid email or password.', 'error');
          if (authSubmitBtn) authSubmitBtn.textContent = 'Log In';
        }
      }
    } catch (err) {
      showToast('Authentication failed.', 'error');
      if (authSubmitBtn) authSubmitBtn.textContent = isSignUp ? 'Sign Up' : 'Log In';
    }
  });

  // If already logged in as customer, redirect to menu
  if (localStorage.getItem('snackdash_session')) {
    window.location.href = 'menu.html';
  }
}

// Global Logout Handler
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('snackdash_session');

    // Disconnect socket for this user
    socket.disconnect();

    window.location.href = 'index.html';
  });
}

// Header scroll effect
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    header?.classList.add('scrolled');
  } else {
    header?.classList.remove('scrolled');
  }
});

// Staggered Scroll Reveal Animation
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

const animElements = document.querySelectorAll('.animate, .card, .category-title, .order-container');
animElements.forEach((el) => {
  if (el.classList.contains('card')) {
    const grid = el.parentElement;
    if (grid && grid.classList.contains('grid')) {
      const cards = Array.from(grid.children);
      const pos = cards.indexOf(el);
      (el as HTMLElement).style.transitionDelay = `${pos * 0.1}s`;
    }
  }
  observer.observe(el);
});

// --- TOAST UTILITY ---
const toastContainer = document.getElementById('toastContainer');
let lastToastMessage = '';
let lastToastTime = 0;

function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (!toastContainer) return;

  const now = Date.now();
  // Prevent duplicate warnings if same message is sent within 2 seconds
  if (message === lastToastMessage && (now - lastToastTime) < 2000) return;

  lastToastMessage = message;
  lastToastTime = now;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      toast.remove();
      // Clear message tracking if no more toasts are visible
      if (toastContainer.children.length === 0) {
        lastToastMessage = '';
      }
    }, 400);
  }, 3000);
}

// --- INVENTORY / ADMIN SYSTEM ---
class InventoryManager {
  private inventory: Record<string, string> = {};

  constructor() {
    this.loadInventory();
    this.listenForLiveUpdates();
  }

  private updateCardUI(card: HTMLElement, state: string) {
    card.dataset.stock = state;

    // Update Badge Text
    const badge = card.querySelector('.stock-badge');
    if (badge) {
      badge.textContent = state === 'in' ? 'In Stock' : 'Sold Out';
    }

    // Update Button Text
    const addBtn = card.querySelector('.add-to-cart-btn');
    if (addBtn) {
      addBtn.textContent = state === 'in' ? 'Add' : 'Sold Out';
    }
  }

  private async loadInventory() {
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      // API returns { id: { status, stock_count, sold_count } } — extract just the status string
      const mapped: Record<string, string> = {};
      for (const key in data) {
        mapped[key] = typeof data[key] === 'object' ? data[key].status : data[key];
      }
      this.inventory = mapped;
      this.syncDOM();
    } catch (err) {
      console.error('Error fetching inventory:', err);
      // Fallback to initial DOM state if server is down
      this.syncDOM();
    }
  }

  private syncDOM() {
    const cards = document.querySelectorAll('.card[data-id]');
    cards.forEach(card => {
      const id = (card as HTMLElement).dataset.id!;
      const state = this.inventory[id] || (card as HTMLElement).dataset.stock || 'in';
      this.inventory[id] = state;
      this.updateCardUI(card as HTMLElement, state);
    });
  }

  private listenForLiveUpdates() {
    socket.on('inventory_updated', (data: { id: string, status: string }) => {
      this.inventory[data.id] = data.status;
      const card = document.querySelector(`.card[data-id="${data.id}"]`);
      if (card) {
        this.updateCardUI(card as HTMLElement, data.status);
      }
    });
  }

  public getStockState(id: string): string {
    return this.inventory[id] || 'in'; // Default to 'in'
  }
}

// Initialize systems
const inventoryManager = new InventoryManager();

// --- MAINTENANCE SYSTEM ---
class MaintenanceManager {
  private readonly STORAGE_CUSTOMER = 'snackdash_maintenance_customer';
  private readonly STORAGE_ORDER = 'snackdash_maintenance_order';

  public isCustomerMaintenance = false;
  public isOrderMaintenance = false;

  constructor() {
    this.checkState();

    // Listen for localStorage changes from other tabs (e.g. Admin Portal on SAME origin)
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_CUSTOMER || e.key === this.STORAGE_ORDER) {
        this.checkState();
      }
    });

    // Listen for cross-origin socket broadcast
    socket.on('maintenance_update', (data: { type: string, isLocked: boolean }) => {
      if (data.type === 'customer') {
        localStorage.setItem(this.STORAGE_CUSTOMER, String(data.isLocked));
      } else if (data.type === 'order') {
        localStorage.setItem(this.STORAGE_ORDER, String(data.isLocked));
      }
      this.checkState();
    });
  }

  private checkState() {
    this.isCustomerMaintenance = localStorage.getItem(this.STORAGE_CUSTOMER) === 'true';
    this.isOrderMaintenance = localStorage.getItem(this.STORAGE_ORDER) === 'true';
    this.applyState();
  }

  public toggleCustomer() {
    this.isCustomerMaintenance = !this.isCustomerMaintenance;
    localStorage.setItem(this.STORAGE_CUSTOMER, String(this.isCustomerMaintenance));
    this.applyState();
    showToast(this.isCustomerMaintenance ? 'Customer Portal Locked' : 'Customer Portal Unlocked', this.isCustomerMaintenance ? 'error' : 'success');
  }

  public toggleOrder() {
    this.isOrderMaintenance = !this.isOrderMaintenance;
    localStorage.setItem(this.STORAGE_ORDER, String(this.isOrderMaintenance));
    this.applyState();
    showToast(this.isOrderMaintenance ? 'Ordering Paused' : 'Ordering Resumed', this.isOrderMaintenance ? 'error' : 'success');
  }

  public applyState() {
    const overlay = document.getElementById('maintenanceOverlay');
    const isScannerApp = window.location.pathname.endsWith('scanner.html') || document.getElementById('scannerApp') !== null;
    const isAdminApp = window.location.pathname.endsWith('admin.html') || document.getElementById('adminLogin') !== null;
    const isCustomerApp = !isScannerApp && !isAdminApp;

    let shouldBlock = false;
    if (isCustomerApp && this.isCustomerMaintenance) {
      shouldBlock = true;
    } else if (isScannerApp && this.isOrderMaintenance) {
      shouldBlock = true;
    }

    if (shouldBlock) {
      document.body.classList.add('is-maintenance');
      overlay?.classList.remove('hidden');
    } else {
      document.body.classList.remove('is-maintenance');
      overlay?.classList.add('hidden');
    }

    // Clean up old banner if present
    const oldBanner = document.getElementById('orderMaintenanceBanner');
    if (oldBanner) oldBanner.remove();
  }
}

const maintenanceManager = new MaintenanceManager();

// (Deprecated) Old single button toggle if it still exists somehow
const maintenanceBtn = document.getElementById('maintenanceToggleBtn');
if (maintenanceBtn) {
  maintenanceBtn.addEventListener('click', () => {
    maintenanceManager.toggleCustomer();
  });
}


// --- CART SYSTEM LOGIC ---

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

class CartManager {
  private items: CartItem[] = [];
  private readonly STORAGE_KEY = 'snackdash_cart';

  // Constraints
  private readonly LIMITS: Record<string, number> = {
    'maggi': 12,
    'yippee': 12,
    'pasta-cheese': 3,
    'pasta-masala': 3,
    'pasta-mushroom': 1,
    'dark-fantasy': 8,
    'madangles-s': 3,
    'madangles-l': 3
  };

  constructor() {
    this.loadFromStorage();
    this.initEventListeners();
    this.render();
  }

  private loadFromStorage() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.items = JSON.parse(saved);
      } catch (e) {
        this.items = [];
      }
    }
  }

  private saveToStorage() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
  }

  private initEventListeners() {
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const card = target.closest('.card') as HTMLElement;

        // Stock check
        if (card?.dataset.stock === 'out') {
          showToast('Sorry, this item is out of stock!', 'error');
          return;
        }

        const id = target.dataset.id!;
        const name = target.dataset.name!;
        const price = parseInt(target.dataset.price!);

        // Get quantity from card controls
        const qtySpan = card.querySelector(`.qty-val[data-id="${id}"]`);
        const quantityToAdd = parseInt(qtySpan?.textContent || '0');

        if (quantityToAdd <= 0) {
          showToast('Please select at least 1 item!', 'error');
          return;
        }

        const success = this.addItem(id, name, price, quantityToAdd);

        if (success) {
          // Visual feedback
          target.textContent = 'Added!';
          const oldColor = target.style.background;
          target.style.background = '#4BB543';

          // Reset card quantity UI back to 0 after adding
          if (qtySpan) qtySpan.textContent = '0';

          setTimeout(() => {
            target.textContent = 'Add';
            target.style.background = oldColor;
          }, 1000);
        }
      });
    });

    // Quantity controls on cards
    document.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const id = target.dataset.id!;
        const span = document.querySelector(`.card .qty-val[data-id="${id}"]`);
        if (!span) return;

        let current = parseInt(span.textContent || '0');
        const limit = this.LIMITS[id] || 99;

        if (target.classList.contains('plus')) {
          if (current < limit) {
            current++;
          } else {
            const typeMap: Record<string, string> = {
              'maggi': 'Maggi', 'yippee': 'Noodles',
              'pasta-cheese': 'Pasta', 'pasta-masala': 'Pasta', 'pasta-mushroom': 'Pasta',
              'dark-fantasy': 'Dark Fantasy',
              'madangles-s': 'Madangles', 'madangles-l': 'Madangles'
            };
            const type = typeMap[id] || 'item';
            showToast(`Strict Limit: Only ${limit} ${type} allowed!`, 'error');
          }
        } else if (current > 0) {
          current--;
        }

        span.textContent = current.toString();
      });
    });

    // Sidebar Toggles
    const trigger = document.getElementById('cartTrigger');
    const close = document.getElementById('closeCart');
    const overlay = document.getElementById('cartOverlay');
    const sidebar = document.getElementById('cartSidebar');

    const toggleCart = (e?: Event) => {
      if (e && (e.currentTarget as HTMLElement)?.id === 'checkoutBtn') {
        // If it's the checkout button, let it navigate instead of just toggling if we are already on menu
        if (sidebar?.classList.contains('open')) {
          sidebar.classList.remove('open');
          overlay?.classList.remove('open');
        }
        return;
      }
      sidebar?.classList.toggle('open');
      overlay?.classList.toggle('open');
    };

    trigger?.addEventListener('click', toggleCart);
    close?.addEventListener('click', toggleCart);
    overlay?.addEventListener('click', toggleCart);

    // Only toggle (close) the cart when clicking checkout if it's open, but don't prevent navigation
    document.getElementById('checkoutBtn')?.addEventListener('click', toggleCart);

    // Clear All Button
    document.getElementById('clearCartBtn')?.addEventListener('click', () => {
      if (this.items.length > 0) {
        this.clear();
        showToast('Cart Cleared!', 'success');
        // Reset all card quantities to 0
        document.querySelectorAll('.qty-val').forEach(span => {
          span.textContent = '0';
        });
      }
    });
  }

  public addItem(id: string, name: string, price: number, quantityToAdd: number): boolean {
    const existing = this.items.find(item => item.id === id);
    const currentQty = existing ? existing.quantity : 0;
    const newTotalQty = currentQty + quantityToAdd;

    // Constraint check
    const limit = this.LIMITS[id];
    if (limit && newTotalQty > limit) {
      const typeMap: Record<string, string> = {
        'maggi': 'Maggi', 'yippee': 'Noodles',
        'pasta-cheese': 'Pasta', 'pasta-masala': 'Pasta', 'pasta-mushroom': 'Pasta',
        'dark-fantasy': 'Dark Fantasy',
        'madangles-s': 'Madangles', 'madangles-l': 'Madangles'
      };
      const type = typeMap[id] || 'item';
      showToast(`Limit Exceeded! You can't order more than ${limit} ${type}.`, 'error');
      return false;
    }

    if (existing) {
      existing.quantity = newTotalQty;
    } else {
      this.items.push({ id, name, price, quantity: quantityToAdd });
    }

    this.saveToStorage();
    this.render();
    return true;
  }

  public updateQuantity(id: string, delta: number) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      const nextQty = item.quantity + delta;

      // Constraint check for manual update in cart
      const limit = this.LIMITS[id];
      if (delta > 0 && limit && nextQty > limit) {
        const typeMap: Record<string, string> = {
          'maggi': 'Maggi', 'yippee': 'Noodles',
          'pasta-cheese': 'Pasta', 'pasta-masala': 'Pasta', 'pasta-mushroom': 'Pasta',
          'dark-fantasy': 'Dark Fantasy',
          'madangles-s': 'Madangles', 'madangles-l': 'Madangles'
        };
        const type = typeMap[id] || 'item';
        showToast(`Wait! Max limit for ${type} is ${limit}.`, 'error');
        return;
      }

      item.quantity = nextQty;
      if (item.quantity <= 0) {
        this.items = this.items.filter(i => i.id !== id);
      }
      this.saveToStorage();
      this.render();
    }
  }

  public render() {
    const cartItemsList = document.getElementById('cartItems');
    const cartBadge = document.getElementById('cartBadge');
    const cartTotalText = document.getElementById('cartTotalText');
    const formCartList = document.getElementById('formCartList');
    const formTotal = document.getElementById('formTotal');
    const submitBtn = document.getElementById('submitOrderBtn') as HTMLButtonElement;
    const clearBtn = document.getElementById('clearCartBtn') as HTMLButtonElement;

    // Update Clear Button state
    if (clearBtn) clearBtn.disabled = this.items.length === 0;

    // Update Badge
    const totalQty = this.items.reduce((sum, item) => sum + item.quantity, 0);
    if (cartBadge) cartBadge.textContent = totalQty.toString();

    // Update Totals
    const totalAmount = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (cartTotalText) cartTotalText.textContent = `₹${totalAmount}`;
    if (formTotal) formTotal.textContent = `₹${totalAmount}`;

    // Update Sidebar List
    if (cartItemsList) {
      if (this.items.length === 0) {
        cartItemsList.innerHTML = '<p style="text-align: center; color: var(--text-dim); margin-top: 2rem;">Your cart is empty!</p>';
      } else {
        cartItemsList.innerHTML = this.items.map(item => `
          <div class="cart-item">
            <div class="cart-item-info">
              <h4>${item.name}</h4>
              <p>₹${item.price} x ${item.quantity}</p>
            </div>
            <div class="qty-controls" style="scale: 0.8">
              <button class="qty-btn" onclick="window.cart.updateQuantity('${item.id}', -1)">-</button>
              <span class="qty-val">${item.quantity}</span>
              <button class="qty-btn" onclick="window.cart.updateQuantity('${item.id}', 1)">+</button>
            </div>
          </div>
        `).join('');
      }
    } else {
      // If sidebar is missing (e.g. checkout page), ensure card quantities sync if they exist
      this.syncCardQuantities();
    }

    // Update Checkout Form Summary
    if (formCartList) {
      if (this.items.length === 0) {
        formCartList.innerHTML = '<p style="color: var(--text-dim)">Cart is empty</p>';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Reserve 0 items';
        }
      } else {
        formCartList.innerHTML = this.items.map(item => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-weight: 500;">
            <span>${item.name} (${item.quantity})</span>
            <span>₹${item.price * item.quantity}</span>
          </div>
        `).join('');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = `Reserve ${totalQty} items`;
        }
      }
    }
  }

  public getItems() { return this.items; }
  public clear() {
    this.items = [];
    this.saveToStorage();
    this.render();
  }

  private syncCardQuantities() {
    this.items.forEach(item => {
      const span = document.querySelector(`.card .qty-val[data-id="${item.id}"]`);
      if (span) span.textContent = item.quantity.toString();
    });
  }
}

// Initialize Cart
const cart = new CartManager();
(window as any).cart = cart;

// --- FORM SUBMISSION ---
const orderForm = document.getElementById('orderForm') as HTMLFormElement;
const successMessage = document.getElementById('successMessage');

orderForm?.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = (document.getElementById('name') as HTMLInputElement).value;
  const phone = (document.getElementById('phone') as HTMLInputElement).value;
  const items = cart.getItems();

  if (!name || !phone || items.length === 0) {
    showToast('Please fill out all details.', 'error');
    return;
  }

  // Strict Validation Rules
  const nameRegex = /^[a-zA-Z\s]+$/;
  if (!nameRegex.test(name)) {
    showToast('Name must only contain uppercase or lowercase letters.', 'error');
    return;
  }

  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) {
    showToast('Phone number must be exactly 10 digits.', 'error');
    return;
  }

  const orderId = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const total = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  // Extract signed in userId if available
  const sessionRaw = localStorage.getItem('snackdash_session');
  let userId = 'GUEST';
  if (sessionRaw) {
    try {
      userId = JSON.parse(sessionRaw).id;
    } catch (e) { }
  }

  const orderData = {
    id: orderId,
    userId,
    customerName: name,
    phone,
    items,
    total
  };

  const submitBtn = document.getElementById('submitOrderBtn') as HTMLButtonElement;
  if (submitBtn) submitBtn.disabled = true;

  socket.emit('place_order', orderData, (response: any) => {
    if (submitBtn) submitBtn.disabled = false;

    if (response.success) {
      const form = document.getElementById('orderForm');
      if (form) {
        form.style.transition = 'all 0.5s ease';
        form.style.opacity = '0';
        form.style.transform = 'translateY(-20px)';

        setTimeout(() => {
          form.style.display = 'none';
          if (successMessage) {
            // Inject the token into the UI
            const tokenDisplay = document.getElementById('orderTokenDisplay');
            if (tokenDisplay) tokenDisplay.textContent = orderId;

            successMessage.style.display = 'block';
            successMessage.style.opacity = '0';
            setTimeout(() => {
              successMessage.style.transition = 'all 0.5s ease';
              successMessage.style.opacity = '1';
              successMessage.style.transform = 'translateY(0)';
            }, 50);
          }
          cart.clear();

          // Save order to history array
          const historyRaw = localStorage.getItem('snackdash_orders');
          const history = historyRaw ? JSON.parse(historyRaw) : [];
          if (!history.includes(orderId)) {
            history.push(orderId);
            localStorage.setItem('snackdash_orders', JSON.stringify(history));
          }

          // Store active chat room ID based on user session or generated order
          let chatRoomId = orderId;
          if (document.getElementById('floatingChat')) document.getElementById('floatingChat')!.style.display = 'flex';

          if (sessionRaw) {
            try {
              const user = JSON.parse(sessionRaw);
              if (user && user.id) {
                chatRoomId = user.id;
              }
            } catch (e) { }
          }

          sessionStorage.setItem('active_order_id', chatRoomId);
          activeOrderId = chatRoomId; // Update global variable

          // Rather than reloading the page, simply initialize the real-time chat module for this user/guest
          // Pass the specific orderId to listen for status updates on that specific order
          initLiveChat(chatRoomId, orderId);
        }, 500);
      }
    } else {
      showToast('Error connecting to server. Please try again.', 'error');
    }
  });
});

// --- LIVE ORDER TRACKING & CHAT TRIGGER ---
let activeOrderId = sessionStorage.getItem('active_order_id');

function initLiveChat(chatRoomId: string, listenOrderId?: string) {
  // Join specific order room for real-time updates and chat messages
  socket.emit('join_order_room', chatRoomId);

  // Track status updates
  socket.on('order_status_update', (data: { id: string, status: string }) => {
    if (data.id === listenOrderId || data.id === chatRoomId) {
      showToast(`Order Status Updated: ${data.status}`, 'success');

      // Update the inline live status badge on the checkout screen if it exists
      const checkoutStatusBadge = document.getElementById('checkoutOrderStatus');
      if (checkoutStatusBadge) {
        checkoutStatusBadge.textContent = data.status;
        // Dynamically style based on status
        if (data.status === 'Preparing') {
          checkoutStatusBadge.style.background = 'rgba(0, 187, 255, 0.2)';
          checkoutStatusBadge.style.color = '#00bbff';
          checkoutStatusBadge.style.borderColor = '#00bbff';
        } else if (data.status === 'Completed') {
          checkoutStatusBadge.style.background = 'rgba(0, 255, 119, 0.2)';
          checkoutStatusBadge.style.color = '#00ff77';
          checkoutStatusBadge.style.borderColor = '#00ff77';
        }
      }

      // Auto-open chat box on Preparing if it exists
      if (data.status === 'Preparing') {
        const chatWidget = document.getElementById('chatWidget');
        if (chatWidget) {
          chatWidget.classList.remove('hidden');
          showToast('Live Support Chat Unlocked!', 'success');
        }
      }
    }
  });

  // --- LIVE CHAT WIDGET LOGIC ---
  const chatWidget = document.getElementById('chatWidget');
  const chatForm = document.getElementById('chatForm') as HTMLFormElement;
  const chatInput = document.getElementById('chatInput') as HTMLInputElement;
  const chatMessages = document.getElementById('chatMessages');
  const closeChatBtn = document.getElementById('closeChatBtn');

  console.log('[ChatInit] Initializing for room:', chatRoomId, { hasWidget: !!chatWidget, hasForm: !!chatForm });

  // Allow closing the widget
  closeChatBtn?.addEventListener('click', () => {
    console.log('[ChatInit] Closing widget');
    chatWidget?.classList.add('hidden');
  });

  // --- PHOTO SEND IN CHAT ---
  const chatPhotoInput = document.createElement('input');
  chatPhotoInput.type = 'file';
  chatPhotoInput.accept = 'image/*';
  chatPhotoInput.style.display = 'none';
  document.body.appendChild(chatPhotoInput);

  if (chatForm) {
    const photoBtn = document.createElement('button');
    photoBtn.type = 'button';
    photoBtn.innerHTML = '📎';
    photoBtn.title = 'Send Photo';
    photoBtn.style.cssText = 'background: none; border: none; font-size: 1.3rem; cursor: pointer; padding: 0.3rem;';
    photoBtn.onclick = () => chatPhotoInput.click();

    // Add before Send button
    const sendBtn = chatForm.querySelector('button[type="submit"]');
    if (sendBtn) {
      chatForm.insertBefore(photoBtn, sendBtn);
    } else {
      chatForm.appendChild(photoBtn);
    }
  }

  chatPhotoInput.addEventListener('change', async () => {
    const file = chatPhotoInput.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch('/api/chat/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success && chatMessages) {
        socket.emit('send_message', {
          orderId: chatRoomId,
          sender: 'customer',
          text: `[Photo Shared](${data.fullUrl})`
        });
      }
    } catch (err) {
      console.error('Photo upload error:', err);
    }
    chatPhotoInput.value = '';
  });

  // Fetch initial messages
  fetch(`/api/orders/${chatRoomId}/messages`)
    .then(res => res.json())
    .then((messages: any[]) => {
      if (chatMessages) {
        chatMessages.innerHTML = ''; // Clear default "Connecting..."
        if (messages.length > 0) {
          messages.forEach(msg => appendMessage(msg));
          scrollToBottom();
        } else {
          chatMessages.innerHTML = '<div class="chat-msg system">Start a conversation with our team!</div>';
        }
      }
    })
    .catch(err => {
      console.error('Failed to load messages', err);
      if (chatMessages) chatMessages.innerHTML = '<div class="chat-msg system">Failed to connect to chat server.</div>';
    });

  // Receive live messages
  socket.on('new_message', (msg) => {
    appendMessage(msg);
    scrollToBottom();

    // Add unread dot if chat is closed and message is from admin
    if (msg.sender === 'admin' && chatWidget?.classList.contains('hidden')) {
      chatFab?.classList.add('has-unread');
    }
  });

  // Remove unread dot when opening chat
  chatFab?.addEventListener('click', () => {
    chatFab.classList.remove('has-unread');
  });
  // Track chat history for AI context
  const chatHistory: { sender: string, text: string }[] = [];

  // Send message
  chatForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    console.log('[ChatSubmit] Text length:', text.length);
    if (!text) return;

    // FIND THE CORRECT BUTTON (Robustly)
    const btn = chatForm.querySelector('button[type="submit"]') || chatForm.querySelector('button:last-of-type') || chatForm.querySelector('.btn') as HTMLButtonElement;
    if (btn) (btn as HTMLButtonElement).disabled = true;

    // Safety timeout to re-enable button much faster if network lags
    const timeout = setTimeout(() => {
      console.warn('[ChatSubmit] Send timeout reached. Re-enabling button.');
      if (btn) (btn as HTMLButtonElement).disabled = false;
      showToast('Message send timed out. Please try again.', 'error');
    }, 4000);

    if (!socket.connected) {
      console.warn('[ChatSubmit] Socket disconnected - attempting reconnect');
      showToast('Offline! Trying to reconnect...', 'error');
      socket.connect();
      // Re-enable button if socket is not connected, as emit will likely fail
      if (btn) (btn as HTMLButtonElement).disabled = false;
      clearTimeout(timeout);
      return;
    }

    // Track in history
    chatHistory.push({ sender: 'customer', text });

    // DEBUG LOG
    console.log('[ChatSubmit] Emitting send_message to room:', chatRoomId);

    socket.emit('send_message', {
      orderId: chatRoomId,
      sender: 'customer',
      text
    }, async (res: any) => {
      console.log('[ChatSubmit] Received server response:', res);
      clearTimeout(timeout);
      if (btn) (btn as HTMLButtonElement).disabled = false;

      if (res && res.success) {
        chatInput.value = '';
        chatInput.focus();
        console.log('[ChatSubmit] Success!');

        // Get AI response
        try {
          const aiRes = await fetch('/api/chat/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: chatHistory, role: 'customer' })
          });
          if (!aiRes.ok) throw new Error('AI Server error');
          const aiData = await aiRes.json();
          if (aiData.success && aiData.reply) {
            chatHistory.push({ sender: 'admin', text: aiData.reply });
            socket.emit('send_message', {
              orderId: chatRoomId,
              sender: 'admin',
              text: `🤖 ${aiData.reply}`
            });
          }
        } catch (err) {
          console.error('AI chat error:', err);
          // Don't toast for AI failures, just log it.
        }
      } else {
        const errorMsg = res?.error || 'Server did not acknowledge message';
        showToast('Failed to send: ' + errorMsg, 'error');
        console.error('Socket send error:', res);
      }
    });
  });

  function appendMessage(msg: { sender: string, text: string, createdAt: string }) {
    if (!chatMessages) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${msg.sender}`;

    // Remove default system message if first real message
    const sysMsg = chatMessages.querySelector('.chat-msg.system');
    if (sysMsg) sysMsg.remove();

    const timestamp = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `${msg.text}<span class="msg-time">${timestamp}</span>`;
    chatMessages.appendChild(div);
    scrollToBottom();
  }

  function scrollToBottom() {
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
}

// --- CHAT FAB LOGIC (Customer portal only — not scanner/admin) ---
const isCustomerPage = !window.location.pathname.includes('scanner') && !window.location.pathname.includes('admin');
const chatFab = isCustomerPage ? document.getElementById('chatFab') : null;

// Initialize on page load if order exists
let isChatInitialized = false;
if (activeOrderId) {
  initLiveChat(activeOrderId);
  isChatInitialized = true;
}

chatFab?.addEventListener('click', () => {
  const chatWidget = document.getElementById('chatWidget');
  if (!chatWidget) return;

  chatWidget.classList.remove('hidden');

  if (!isChatInitialized) {
    let chatRoomId = sessionStorage.getItem('active_order_id');

    // If no order active, fallback to User ID or Guest ID
    if (!chatRoomId) {
      const sessionRaw = localStorage.getItem('snackdash_session');
      if (sessionRaw) {
        try {
          const user = JSON.parse(sessionRaw);
          if (user && user.id) {
            chatRoomId = user.id;
          }
        } catch (e) { }
      }
    }

    if (!chatRoomId) {
      // Generate Guest ID
      chatRoomId = 'GUEST-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      sessionStorage.setItem('active_order_id', chatRoomId);

      // Register guest session with server so Admin sees it in dashboard
      socket.emit('place_order', {
        id: chatRoomId,
        userId: 'GUEST',
        customerName: 'Guest User',
        phone: 'Support Chat',
        items: [],
        total: 0
      }, (ack: any) => {
        if (!ack?.success) console.error('Guest registration failed');
      });

      // Add an initial welcome message ONLY for brand new guests
      const chatMessages = document.getElementById('chatMessages');
      if (chatMessages) {
        chatMessages.innerHTML = '<div class="chat-msg system">Hi there! How can we help you today?</div>';
      }
    }

    // Always initialize if it hasn't been done during this page load
    initLiveChat(chatRoomId);
    isChatInitialized = true;
  }
});

// --- INITIALIZE ALL ON DOM READY ---
function startApp() {
  // Live Order Tracking and Chat (for customers)
  if (activeOrderId && !isChatInitialized) {
    initLiveChat(activeOrderId!);
    isChatInitialized = true;
  }
}

document.addEventListener('DOMContentLoaded', startApp);

// --- FEEDBACK SUBMISSION ---
const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
const feedbackSuccess = document.getElementById('feedbackSuccessMessage');

feedbackForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = (document.getElementById('feedbackName') as HTMLInputElement).value;
  const type = (document.getElementById('feedbackType') as HTMLSelectElement).value;
  const message = (document.getElementById('feedbackMessage') as HTMLTextAreaElement).value;

  if (!message) return;

  const submitBtn = feedbackForm.querySelector('button[type="submit"]') as HTMLButtonElement;
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: name || 'Anonymous', type, content: message })
    });

    if (!res.ok) throw new Error('Failed to submit feedback');

    const wrapper = document.getElementById('feedbackForm');
    if (wrapper) {
      wrapper.style.transition = 'all 0.5s ease';
      wrapper.style.opacity = '0';
      wrapper.style.transform = 'translateY(-20px)';

      setTimeout(() => {
        wrapper.style.display = 'none';
        if (feedbackSuccess) {
          feedbackSuccess.style.display = 'block';
          feedbackSuccess.style.opacity = '0';
          setTimeout(() => {
            feedbackSuccess.style.transition = 'all 0.5s ease';
            feedbackSuccess.style.opacity = '1';
            feedbackSuccess.style.transform = 'translateY(0)';
          }, 50);
        }
        showToast('Feedback Submitted. Thank you!', 'success');
      }, 500);
    }
  } catch (err) {
    console.error('Feedback error:', err);
    showToast('Failed to submit feedback. Try again.', 'error');
    if (submitBtn) submitBtn.disabled = false;
  }
});

// Subtle background motion
document.addEventListener('mousemove', (e) => {
  const blobs = document.querySelectorAll('.blob');
  const x = e.clientX / window.innerWidth;
  const y = e.clientY / window.innerHeight;

  blobs.forEach((blob, index) => {
    const factor = (index + 1) * 20;
    (blob as HTMLElement).style.transform = `translate(${x * factor}px, ${y * factor}px)`;
  });
});

// --- CATEGORY NAV SCROLLSPY ---
const catLinks = document.querySelectorAll('.cat-link');
const catSections = document.querySelectorAll('.category-title[id]');

if (catLinks.length > 0 && catSections.length > 0) {
  window.addEventListener('scroll', () => {
    let currentId = '';
    catSections.forEach(section => {
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      if (window.scrollY >= sectionTop - 160) {
        currentId = section.getAttribute('id') || '';
      }
    });

    if (currentId) {
      catLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentId}`) {
          link.classList.add('active');
        }
      });
    }
  });

  // Also handle click for instant active state and smooth scroll offset
  catLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      catLinks.forEach(l => l.classList.remove('active'));
      const targetLink = e.currentTarget as HTMLAnchorElement;
      targetLink.classList.add('active');

      const targetId = targetLink.getAttribute('href')?.substring(1);
      const targetSection = document.getElementById(targetId || '');

      if (targetSection) {
        // Main header (~55px) + Category Nav (~45px) + some breathing room
        const offset = 120;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = targetSection.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

// --- ORDER TRACKING LOGIC ---
// --- ORDERS DASHBOARD LOGIC ---
async function initOrdersDashboard() {
  const container = document.getElementById('ordersDashboardContainer');
  const noOrdersMessage = document.getElementById('noOrdersMessage');
  const ordersSubtitle = document.getElementById('ordersSubtitle');
  if (!container) return; // Not on the orders page

  const sessionRaw = localStorage.getItem('snackdash_session');
  if (!sessionRaw) {
    window.location.href = 'index.html';
    return;
  }

  const userId = JSON.parse(sessionRaw).id;

  try {
    let orders: any[] = [];

    try {
      const res = await fetch(`/api/users/${userId}/orders`);
      if (res.ok) {
        orders = await res.json();
      }
    } catch (e) {
      console.warn('Failed to fetch user orders from server');
    }

    // Merge purely guest orders from local device storage
    const historyRaw = localStorage.getItem('snackdash_orders');
    if (historyRaw) {
      const guestIds: string[] = JSON.parse(historyRaw);
      const userOrderIds = orders.map(o => o.id);

      const missingGuestIds = guestIds.filter(id => !userOrderIds.includes(id));

      for (const gid of missingGuestIds) {
        try {
          const guestRes = await fetch(`/api/orders/${gid}`);
          if (guestRes.ok) {
            const guestOrder = await guestRes.json();
            if (guestOrder && !guestOrder.error && guestOrder.items) {
              orders.push(guestOrder);
            }
          }
        } catch (e) {
          console.warn(`Could not load Guest Order ${gid}`);
        }
      }

      // Re-sort orders by date descending after merging
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (!orders || orders.length === 0) {
      if (ordersSubtitle) ordersSubtitle.style.display = 'none';
      if (noOrdersMessage) noOrdersMessage.style.display = 'block';
      return;
    }

    let html = '';

    for (const order of orders) {
      // Join socket room for real-time updates while on page
      socket.emit('join_order_room', order.id);

      let statusColor = 'var(--text-dim)';
      switch (order.status) {
        case 'Preparing': statusColor = '#00bbff'; break;
        case 'Completed': statusColor = '#00ff77'; break;
      }

      html += `
        <div class="glass-card" style="padding: 1.5rem; border-radius: 1.5rem; border: 1px solid rgba(255,255,255,0.05); text-align: left; position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <div>
              <div style="font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.3rem;">Order ID Number</div>
              <div style="font-weight: 800; font-size: 1.2rem; color: #fff;">Order #${order.id}</div>
              <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 0.2rem;">${new Date(order.createdAt).toLocaleString()}</div>
            </div>
            <div style="text-align: right;">
              <span id="badge-${order.id}" style="display: inline-block; padding: 0.3rem 0.8rem; border-radius: 2rem; background: ${statusColor}22; color: ${statusColor}; font-weight: 700; font-size: 0.8rem; border: 1px solid ${statusColor}55;">
                ${order.status}
              </span>
            </div>
          </div>
          
          <div style="margin-bottom: 1.5rem;">
            ${order.items.map((item: any) => `
              <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: rgba(255,255,255,0.9); margin-bottom: 0.4rem;">
                <span>${item.quantity}x ${item.name}</span>
                <span>₹${item.price * item.quantity}</span>
              </div>
            `).join('')}
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
            <div>
              <span style="font-weight: 700; color: var(--text-dim); font-size: 0.9rem; display: block;">Total Paid</span>
              <span style="font-weight: 900; color: var(--primary); font-size: 1.2rem;">₹${order.total}</span>
            </div>
            <button class="btn btn-outline reorder-btn" data-order='${JSON.stringify(order.items).replace(/'/g, "&#39;")}' style="padding: 0.4rem 1rem; font-size: 0.8rem;">
              Reorder Items
            </button>
          </div>
        </div>
      `;
    }

    if (html === '') {
      if (ordersSubtitle) ordersSubtitle.style.display = 'none';
      if (noOrdersMessage) noOrdersMessage.style.display = 'block';
    } else {
      if (ordersSubtitle) ordersSubtitle.textContent = 'Here are your recent cravings.';
      container.innerHTML = html;

      // Attach reorder event listeners
      const reorderBtns = container.querySelectorAll('.reorder-btn');
      reorderBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.currentTarget as HTMLButtonElement;
          const itemsData = target.getAttribute('data-order');
          if (itemsData) {
            try {
              const previousItems = JSON.parse(itemsData);
              cart.clear(); // Clear existing cart

              let addedAny = false;
              previousItems.forEach((item: any) => {
                const stockState = inventoryManager.getStockState(item.id);
                if (stockState === 'out') {
                  showToast(`Skipped ${item.name} - currently out of stock`, 'error');
                  return; // Skip if out of stock
                }

                // Add the item via the public method
                const success = cart.addItem(item.id, item.name, item.price, item.quantity);
                if (success) addedAny = true;
              });

              if (addedAny) {
                showToast('Items added to cart! Redirecting to checkout...', 'success');
                setTimeout(() => {
                  window.location.href = 'checkout.html';
                }, 1500);
              } else {
                showToast('Could not reorder any items. Placed limits may be exceeded.', 'error');
              }

            } catch (err) {
              console.error('Failed to parse reorder items', err);
            }
          }
        });
      });
    }
  } catch (err) {
    console.error('Failed to load orders dashboard:', err);
    if (ordersSubtitle) ordersSubtitle.textContent = 'Failed to load orders. Please try again later.';
  }

  // Listen for real-time order updates
  socket.on('order_status_update', (data: { id: string, status: string }) => {
    const badge = document.getElementById(`badge-${data.id}`);
    if (badge) {
      let statusColor = 'var(--text-dim)';
      switch (data.status) {
        case 'Pending': statusColor = '#ffbb00'; break;
        case 'Preparing': statusColor = '#00bbff'; break;
        case 'Completed': statusColor = '#00ff77'; break;
      }
      badge.textContent = data.status;
      badge.style.background = `${statusColor}22`;
      badge.style.color = statusColor;
      badge.style.borderColor = `${statusColor}55`;

      showToast(`Order ${data.id} is now ${data.status}!`, 'success');
    }
  });
}

// Call on page load
initOrdersDashboard();

// --- SCANNER / KITCHEN APP LOGIC ---

function initScannerApp() {
  const appWrap = document.getElementById('scannerApp');
  const searchForm = document.getElementById('scannerSearchForm') as HTMLFormElement;
  const searchInput = document.getElementById('orderIdSearch') as HTMLInputElement;
  const resultDiv = document.getElementById('scannerResult');

  if (!appWrap) return; // Not on scanner.html

  // Scanner Logout
  const scannerLogoutBtn = document.getElementById('scannerLogoutBtn');
  if (scannerLogoutBtn) {
    scannerLogoutBtn.addEventListener('click', () => {
      localStorage.removeItem('snackdash_scanner_session');
      window.location.href = 'index.html';
    });
  }

  // --- SCANNER CHAT (receives customer messages) ---
  const chatWidget = document.getElementById('chatWidget');
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm') as HTMLFormElement;
  const chatInput = document.getElementById('chatInput') as HTMLInputElement;
  const chatTitle = document.getElementById('chatTitle');
  const chatFab = document.getElementById('chatFab');
  const closeChatBtn = document.getElementById('closeChatBtn');
  let activeChatOrderId: string | null = null;

  function closeScannerChat() {
    if (chatWidget) chatWidget.classList.add('hidden');
    activeChatOrderId = null;
  }

  if (closeChatBtn) {
    closeChatBtn.addEventListener('click', closeScannerChat);
  }

  if (chatFab) {
    chatFab.addEventListener('click', () => {
      if (chatWidget) chatWidget.classList.toggle('hidden');
      chatFab.classList.remove('has-unread'); // Clear red dot when opened
    });
  }

  // Open chat from order result (exposed globally)
  (window as any).openScannerChat = async (id: string) => {
    activeChatOrderId = id;
    if (chatTitle) chatTitle.innerText = `Chat: Order #${id.split('-')[1]}`;
    if (chatWidget) chatWidget.classList.remove('hidden');
    if (chatFab) chatFab.classList.remove('has-unread'); // Clear red dot

    socket.emit('join_order_room', id);

    try {
      const res = await fetch(`/api/orders/${id}/messages`);
      const messages = await res.json();

      if (chatMessages) {
        chatMessages.innerHTML = '';
        if (messages.length === 0) {
          chatMessages.innerHTML = '<div class="chat-msg system">No messages yet. Say hi!</div>';
        } else {
          messages.forEach((msg: any) => {
            const div = document.createElement('div');
            div.className = `chat-msg ${msg.sender === 'admin' ? 'customer' : 'admin'}`;
            div.innerHTML = `${msg.text}<span class="msg-time">${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
            chatMessages.appendChild(div);
          });
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  socket.on('new_message', (msg: any) => {
    if (msg.orderId === activeChatOrderId && chatMessages) {
      const div = document.createElement('div');
      div.className = `chat-msg ${msg.sender === 'admin' ? 'customer' : 'admin'}`;
      div.innerHTML = `${msg.text}<span class="msg-time">${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
      const sysMsg = chatMessages.querySelector('.chat-msg.system');
      if (sysMsg) sysMsg.remove();
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    // Show red dot if chat is hidden and message is from customer
    if (msg.sender === 'customer' && chatWidget?.classList.contains('hidden') && chatFab) {
      chatFab.classList.add('has-unread');
    }
  });

  // Send response to customer (with AI fallback)
  const scannerChatHistory: { sender: string, text: string }[] = [];
  let scannerStaffChatMode = false;

  // Listen for staff chat messages
  socket.on('staff_new_message', (msg: any) => {
    if (!scannerStaffChatMode) return;
    if (msg.sender === 'scanner') return; // Don't echo our own
    if (chatMessages) {
      const div = document.createElement('div');
      div.className = 'chat-msg admin';
      div.innerHTML = `📡 <b>Admin:</b> ${msg.text}<span class="msg-time">${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });

  socket.on('staff_system', (data: any) => {
    if (!scannerStaffChatMode) return;
    if (chatMessages) {
      const div = document.createElement('div');
      div.className = 'chat-msg system';
      div.innerHTML = `🔗 ${data.text}`;
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });

  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = chatInput?.value.trim();
      if (!text) return;

      // Detect code 1278 to enter staff chat
      if (text === '1278') {
        scannerStaffChatMode = true;
        socket.emit('join_staff_chat', 'Scanner');
        if (chatTitle) chatTitle.innerText = '🔗 Direct Staff Chat';
        if (chatMessages) chatMessages.innerHTML = '<div class="chat-msg system">🔗 Connected to Staff Chat. You can now talk directly with Admin.</div>';
        if (chatInput) chatInput.value = '';
        return;
      }

      // Detect end12 to exit staff chat and return to AI
      if (text === 'end12' && scannerStaffChatMode) {
        scannerStaffChatMode = false;
        activeChatOrderId = null;
        if (chatTitle) chatTitle.innerText = 'SnackBot AI Chat';
        if (chatMessages) chatMessages.innerHTML = '<div class="chat-msg system">Staff chat ended. SnackBot AI is back! 🤖</div>';
        if (chatInput) chatInput.value = '';
        return;
      }

      // --- STAFF CHAT MODE ---
      if (scannerStaffChatMode) {
        if (chatMessages) {
          const sysMsg = chatMessages.querySelector('.chat-msg.system');
          if (sysMsg && sysMsg.textContent?.includes('Connected')) sysMsg.remove();
          const sentDiv = document.createElement('div');
          sentDiv.className = 'chat-msg customer';
          sentDiv.innerHTML = `${text}<span class="msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
          chatMessages.appendChild(sentDiv);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        if (chatInput) chatInput.value = '';
        socket.emit('staff_message', { sender: 'scanner', text });
        return;
      }

      // --- NORMAL AI CHAT MODE ---
      if (!activeChatOrderId) {
        activeChatOrderId = 'SCANNER-SUPPORT';
        socket.emit('join_order_room', activeChatOrderId);
        if (chatTitle) chatTitle.innerText = 'SnackBot AI Chat';
      }

      if (chatMessages) {
        const sysMsg = chatMessages.querySelector('.chat-msg.system');
        if (sysMsg) sysMsg.remove();
        const div = document.createElement('div');
        div.className = 'chat-msg customer';
        div.innerHTML = `${text}<span class="msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }

      if (chatInput) chatInput.value = '';
      scannerChatHistory.push({ sender: 'customer', text });

      try {
        const aiRes = await fetch('/api/chat/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: scannerChatHistory, role: 'scanner' })
        });
        const aiData = await aiRes.json();

        if (aiData.action === 'connect_to_customer' && aiData.orderId) {
          activeChatOrderId = aiData.orderId;
          socket.emit('join_order_room', aiData.orderId);
          if (chatTitle) chatTitle.innerText = `Chat: Order #${aiData.orderId.split('-')[1]}`;
          try {
            const msgRes = await fetch(`/api/orders/${aiData.orderId}/messages`);
            const msgs = await msgRes.json();
            if (chatMessages) {
              chatMessages.innerHTML = '';
              if (msgs.length > 0) {
                msgs.forEach((msg: any) => {
                  const div = document.createElement('div');
                  div.className = `chat-msg ${msg.sender === 'admin' ? 'customer' : 'admin'}`;
                  div.innerHTML = `${msg.text}<span class="msg-time">${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
                  chatMessages.appendChild(div);
                });
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }
            }
          } catch (e) { console.error(e); }
        }

        if (aiData.success && aiData.reply && chatMessages) {
          scannerChatHistory.push({ sender: 'admin', text: aiData.reply });
          const div = document.createElement('div');
          div.className = 'chat-msg admin';
          div.innerHTML = `🤖 ${aiData.reply}<span class="msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
          chatMessages.appendChild(div);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      } catch (err) {
        console.error('AI chat error:', err);
      }
    });
  }

  // Focus search on load
  if (searchInput) searchInput.focus();

  // Handle Search
  if (searchForm) {
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      let rawInput = searchInput.value.trim().toUpperCase();
      if (!rawInput) return;

      // Remove leading hash if they typed it
      if (rawInput.startsWith('#')) {
        rawInput = rawInput.substring(1);
      }

      // Auto-append ORD- prefix if they just typed the alphanumeric code
      const orderId = rawInput.startsWith('ORD-') ? rawInput : `ORD-${rawInput}`;

      if (resultDiv) {
        resultDiv.classList.remove('hidden');
        resultDiv.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 2rem;">Searching for ${orderId}...</div>`;
      }

      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) {
          throw new Error('Order not found');
        }

        const data = await res.json();

        let itemsHtml = '';
        data.items.forEach((item: any) => {
          itemsHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; background: rgba(255,255,255,0.05); border-radius: 1rem; margin-bottom: 1rem;">
              <div style="font-size: 2.5rem; font-weight: 900; color: #fff;">
                <span style="color: var(--primary); margin-right: 1rem;">${item.quantity}x</span> ${item.name}
              </div>
              <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-dim);">
                ₹${item.price * item.quantity}
              </div>
            </div>
          `;
        });

        if (resultDiv) {
          resultDiv.innerHTML = `
            <div class="glass-card" style="padding: 2.5rem; border-radius: 2rem; border: 2px solid var(--primary); text-align: left;">
              
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <div>
                  <div style="font-size: 1rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 0.5rem;">Order Details</div>
                  <div style="font-weight: 900; font-size: 2.5rem; color: #fff; line-height: 1.2;">
                    ${data.customerName}
                  </div>
                  <div style="font-size: 1.2rem; color: var(--text-dim); margin-top: 0.5rem;">
                    ${data.phone}
                  </div>
                  <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-dim); margin-top: 1rem;">
                    Total: <strong style="color: var(--primary);">₹${data.total}</strong>
                  </div>
                </div>
                
                <div style="text-align: right;">
                  <div style="font-size: 1rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 0.5rem;">Update Status</div>
                  <select id="scannerStatusSelect" class="order-status status-${data.status}" style="font-size: 1.2rem; padding: 0.5rem 1rem; border-radius: 2rem; font-weight: 800; cursor: pointer;">
                    <option value="Preparing" ${data.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                    <option value="Completed" ${data.status === 'Completed' ? 'selected' : ''}>Completed</option>
                  </select>
                </div>
              </div>

              <div style="margin-bottom: 1rem;">
                <div style="font-size: 1rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 1.5rem;">Items to Prepare</div>
                ${itemsHtml}
              </div>

              <button class="btn btn-outline" style="margin-top: 1rem; width: 100%; text-align: center;" onclick="window.openScannerChat('${data.userId && data.userId !== 'GUEST' ? data.userId : orderId}')">
                Open Live Chat with Customer
              </button>

            </div>
          `;

          // Attach Status Update Listener
          const statusSelect = document.getElementById('scannerStatusSelect') as HTMLSelectElement;
          if (statusSelect) {
            statusSelect.addEventListener('change', async (ev) => {
              const newStatus = (ev.target as HTMLSelectElement).value;
              try {
                const patchRes = await fetch(`/api/orders/${orderId}/status`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: newStatus })
                });
                if (!patchRes.ok) throw new Error('Update failed');

                showToast(`Status updated to ${newStatus}`, 'success');
                statusSelect.className = `order-status status-${newStatus}`;

                // Emit socket event to notify other clients (Admin & Customer)
                socket.emit('order_status_update', { id: orderId, status: newStatus });

              } catch (e) {
                showToast('Failed to update order status', 'error');
                console.error(e);
              }
            });
          }
        }

      } catch (err) {
        if (resultDiv) {
          resultDiv.innerHTML = `
            <div class="glass-card" style="padding: 3rem; border-radius: 2rem; border: 2px solid #ff4444; background: rgba(255, 68, 68, 0.1); text-align: center;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <h3 style="font-size: 2rem; color: #fff; margin-bottom: 0.5rem;">Order Not Found</h3>
              <p style="color: rgba(255,255,255,0.7); font-size: 1.2rem;">Could not locate order ID: <strong style="color: #fff;">${orderId}</strong></p>
              <p style="color: rgba(255,255,255,0.5); font-size: 0.9rem; margin-top: 1rem;">Make sure to include the "ORD-" prefix if applicable.</p>
            </div>
          `;
        }
      } finally {
        // Always clear input for next scan
        searchInput.value = '';
      }
    });
  }

  // --- SCANNER INVENTORY MANAGEMENT ---
  const manageStockBtn = document.getElementById('manageStockBtn');
  const scannerInventoryModal = document.getElementById('scannerInventoryModal');
  const closeStockModalBtn = document.getElementById('closeStockModalBtn');
  const scannerInventoryList = document.getElementById('scannerInventoryList');

  const MENU_ITEMS = [
    { id: 'maggi', name: 'Classic Maggi', type: 'Noodles', defaultPrice: 25 },
    { id: 'yippee', name: 'Yippee Magic', type: 'Noodles', defaultPrice: 25 },
    { id: 'pasta-cheese', name: 'Cheese Macaroni', type: 'Pasta', defaultPrice: 50 },
    { id: 'pasta-masala', name: 'Masala Penne', type: 'Pasta', defaultPrice: 50 },
    { id: 'pasta-mushroom', name: 'Mushroom Penne', type: 'Pasta', defaultPrice: 50 },
    { id: 'dark-fantasy', name: 'Dark Fantasy', type: 'Snacks', defaultPrice: 15 },
    { id: 'madangles-s', name: 'Madangles (S)', type: 'Snacks', defaultPrice: 35 },
    { id: 'madangles-l', name: 'Madangles (L)', type: 'Snacks', defaultPrice: 70 }
  ];

  async function fetchScannerInventory() {
    if (!scannerInventoryList) return;
    try {
      const res = await fetch('/api/inventory');
      const inventoryMap = await res.json();

      scannerInventoryList.innerHTML = MENU_ITEMS.map(item => {
        const data = inventoryMap[item.id] || { status: 'in', stock_count: 0, sold_count: 0 };
        const stockCount = data.stock_count || 0;
        const soldCount = data.sold_count || 0;
        const isOut = data.status === 'out' || stockCount <= 0;

        return `
          <div style="border: 1px solid ${isOut ? 'rgba(255,77,79,0.3)' : 'rgba(0,255,119,0.2)'}; padding: 1.5rem; border-radius: 1rem; background: ${isOut ? 'rgba(255, 77, 79, 0.05)' : 'rgba(0, 255, 119, 0.05)'};">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                  <div>
                      <h3 style="font-weight: 800; font-size: 1.2rem; margin-bottom: 0.2rem; color: #fff;">${item.name}</h3>
                      <div style="color: var(--text-dim); font-size: 0.9rem;">${item.type} • ₹${item.defaultPrice}</div>
                  </div>
                  <div style="display: flex; gap: 0.5rem;">
                      <button onclick="window.toggleStock('${item.id}', 'in')"
                        style="padding: 0.5rem 1rem; border-radius: 0.5rem; border: 2px solid ${!isOut ? '#00ff77' : 'rgba(255,255,255,0.15)'}; background: ${!isOut ? 'rgba(0,255,119,0.15)' : 'transparent'}; color: ${!isOut ? '#00ff77' : 'var(--text-dim)'}; font-weight: 700; cursor: pointer; font-size: 0.85rem;">
                        ✅ In Stock
                      </button>
                      <button onclick="window.toggleStock('${item.id}', 'out')"
                        style="padding: 0.5rem 1rem; border-radius: 0.5rem; border: 2px solid ${isOut ? '#ff4d4f' : 'rgba(255,255,255,0.15)'}; background: ${isOut ? 'rgba(255,77,79,0.15)' : 'transparent'}; color: ${isOut ? '#ff4d4f' : 'var(--text-dim)'}; font-weight: 700; cursor: pointer; font-size: 0.85rem;">
                        ❌ Out
                      </button>
                  </div>
              </div>
              <div style="display: flex; gap: 1rem; align-items: center;">
                  <div style="flex: 1;">
                      <label style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px;">Stock Count</label>
                      <input type="number" id="stock_${item.id}" min="0" value="${stockCount}"
                        style="width: 100%; padding: 0.6rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #fff; font-size: 1.1rem; font-weight: 700; text-align: center; box-sizing: border-box;">
                  </div>
                  <div style="flex: 1;">
                      <label style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px;">Sold</label>
                      <input type="number" id="sold_${item.id}" min="0" value="${soldCount}"
                        style="width: 100%; padding: 0.6rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #fff; font-size: 1.1rem; font-weight: 700; text-align: center; box-sizing: border-box;">
                  </div>
                  <button class="btn btn-primary" style="padding: 0.6rem 1.2rem; font-size: 0.85rem; align-self: flex-end; white-space: nowrap;" onclick="window.saveScannerStock('${item.id}')">
                      Save
                  </button>
              </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to fetch scanner inventory:', err);
      scannerInventoryList.innerHTML = '<p style="color: #ff4d4f; text-align: center;">Failed to load inventory.</p>';
    }
  }

  // Save stock and sold counts
  (window as any).saveScannerStock = async (id: string) => {
    const stockInput = document.getElementById(`stock_${id}`) as HTMLInputElement;
    const soldInput = document.getElementById(`sold_${id}`) as HTMLInputElement;
    if (!stockInput || !soldInput) {
      alert('Error: Could not find stock inputs for ' + id);
      return;
    }

    const stock_count = parseInt(stockInput.value) || 0;
    const sold_count = parseInt(soldInput.value) || 0;

    try {
      const res = await fetch('/api/inventory/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stock_count, sold_count })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchScannerInventory();
        // Show a prominent popup message
        const popup = document.createElement('div');
        popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;z-index:9999;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);animation:fadeIn .25s ease;';
        popup.innerHTML = `
          <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid #00ff77;border-radius:1.5rem;padding:2.5rem 3rem;text-align:center;max-width:400px;width:90%;box-shadow:0 0 40px rgba(0,255,119,0.15);animation:popIn .3s ease;">
            <div style="font-size:3rem;margin-bottom:0.8rem;">✅</div>
            <h3 style="color:#00ff77;font-size:1.5rem;font-weight:900;margin:0 0 0.5rem;">Saved Successfully!</h3>
            <p style="color:rgba(255,255,255,0.7);font-size:0.95rem;margin:0;">${id}: ${stock_count} in stock, ${sold_count} sold</p>
          </div>
        `;
        // Add animations if not already present
        if (!document.getElementById('popupAnimStyles')) {
          const style = document.createElement('style');
          style.id = 'popupAnimStyles';
          style.textContent = '@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes popIn{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}@keyframes fadeOut{from{opacity:1}to{opacity:0}}';
          document.head.appendChild(style);
        }
        document.body.appendChild(popup);
        popup.addEventListener('click', () => { popup.style.animation = 'fadeOut .2s ease forwards'; setTimeout(() => popup.remove(), 200); });
        setTimeout(() => { if (popup.parentNode) { popup.style.animation = 'fadeOut .2s ease forwards'; setTimeout(() => popup.remove(), 200); } }, 2000);
      } else {
        showToast('Failed to update stock: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating stock', 'error');
    }
  };

  // Toggle stock status (In Stock / Out of Stock)
  (window as any).toggleStock = async (id: string, status: string) => {
    try {
      const stockCount = status === 'in' ? 10 : 0;
      const res = await fetch('/api/inventory/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stock_count: stockCount, sold_count: 0 })
      });
      if (res.ok) {
        fetchScannerInventory();
        showToast(`${id}: ${status === 'in' ? '✅ In Stock' : '❌ Out of Stock'}`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating status', 'error');
    }
  };

  if (manageStockBtn && scannerInventoryModal && closeStockModalBtn) {
    manageStockBtn.addEventListener('click', () => {
      scannerInventoryModal.classList.remove('hidden');
      fetchScannerInventory();
    });

    closeStockModalBtn.addEventListener('click', () => {
      scannerInventoryModal.classList.add('hidden');
    });
  }
  // --- ADD PRODUCT ---
  const addProductBtn = document.getElementById('addProductBtn');
  const addProductModal = document.getElementById('addProductModal');
  const closeAddProductBtn = document.getElementById('closeAddProductBtn');
  const addProductForm = document.getElementById('addProductForm') as HTMLFormElement;
  const productPhoto = document.getElementById('productPhoto') as HTMLInputElement;
  const photoPreview = document.getElementById('photoPreview') as HTMLImageElement;
  const photoPlaceholder = document.getElementById('photoPlaceholder');

  if (addProductBtn && addProductModal && closeAddProductBtn) {
    addProductBtn.addEventListener('click', () => addProductModal.classList.remove('hidden'));
    closeAddProductBtn.addEventListener('click', () => addProductModal.classList.add('hidden'));
  }

  // Photo preview
  if (productPhoto && photoPreview && photoPlaceholder) {
    productPhoto.addEventListener('change', () => {
      const file = productPhoto.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          photoPreview.src = e.target?.result as string;
          photoPreview.style.display = 'block';
          photoPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Submit new product
  if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (document.getElementById('productName') as HTMLInputElement).value.trim();
      const type = (document.getElementById('productType') as HTMLSelectElement).value;
      const price = (document.getElementById('productPrice') as HTMLInputElement).value;
      const photo = (document.getElementById('productPhoto') as HTMLInputElement).files?.[0];
      const msgDiv = document.getElementById('addProductMsg');

      if (!name || !type || !price) return;

      const formData = new FormData();
      formData.append('name', name);
      formData.append('type', type);
      formData.append('price', price);
      if (photo) formData.append('photo', photo);

      try {
        const res = await fetch('/api/products/add', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          if (msgDiv) {
            msgDiv.style.display = 'block';
            msgDiv.style.color = '#00ff77';
            msgDiv.textContent = `✅ ${name} added successfully!`;
          }
          addProductForm.reset();
          if (photoPreview) { photoPreview.style.display = 'none'; }
          if (photoPlaceholder) { photoPlaceholder.style.display = 'block'; }
          showToast(`Product "${name}" added!`, 'success');
          setTimeout(() => {
            if (msgDiv) msgDiv.style.display = 'none';
          }, 3000);
        } else {
          showToast('Failed to add product', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Error adding product', 'error');
      }
    });
  }

  // Photo button logic moved inside initLiveChat to prevent interference on customer pages
}

// Ensure it runs after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScannerApp);
} else {
  initScannerApp();
}
