import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                admin: resolve(__dirname, 'admin.html'),
                scanner: resolve(__dirname, 'scanner.html'),
                menu: resolve(__dirname, 'menu.html'),
                checkout: resolve(__dirname, 'checkout.html'),
                orders: resolve(__dirname, 'orders.html'),
                feedback: resolve(__dirname, 'feedback.html'),
            }
        }
    }
});
