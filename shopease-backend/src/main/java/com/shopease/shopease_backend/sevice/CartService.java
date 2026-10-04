package com.shopease.shopease_backend.service;

import com.shopease.shopease_backend.model.Cart;
import com.shopease.shopease_backend.model.CartItem;
import com.shopease.shopease_backend.model.Product;
import com.shopease.shopease_backend.repository.CartItemRepository;
import com.shopease.shopease_backend.repository.CartRepository;
import com.shopease.shopease_backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Service class for Cart and CartItem business logic.
 *
 * This is one of the most logic-heavy services. It handles adding items,
 * removing items, quantity management, and stock checks.
 *
 * @Transactional on methods that modify data ensures that if any step
 * fails, the entire operation is rolled back — protecting data integrity.
 */
@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final com.shopease.shopease_backend.repository.AccountRepository accountRepository;

    // ─── CART ─────────────────────────────────────────────────────────────────

    /** Returns all carts (admin use). */
    public List<Cart> getAllCarts() {
        return cartRepository.findAll();
    }

    /** Retrieves the cart for a specific customer by ID. */
    public Cart getCartByCustomerId(Integer customerId) {
        return cartRepository.findByCustomer_AccountID(customerId)
            .orElseThrow(() -> new IllegalArgumentException(
                "No cart found for customer ID: " + customerId
            ));
    }

    /** 
     * Retrieves the cart for a specific customer by Email. 
     * VIVA: Used by the JWT-based /api/cart endpoint.
     */
    public Cart getCartByCustomerEmail(String email) {
        return cartRepository.findByCustomer_Email(email)
            .orElseGet(() -> {
                com.shopease.shopease_backend.model.Account account = accountRepository.findByEmail(email)
                    .orElseThrow(() -> new IllegalArgumentException("No account found for email: " + email));
                Cart newCart = new Cart();
                newCart.setCustomer(account);
                newCart.setUpdatedAt(java.time.LocalDate.now());
                return cartRepository.save(newCart);
            });
    }

    // ─── CART ITEMS ───────────────────────────────────────────────────────────

    /** Returns all items inside a specific cart. */
    public List<CartItem> getCartItems(Integer cartId) {
        return cartItemRepository.findByCart_CartID(cartId);
    }

    /**
     * Internal method to handle the logic of adding an item to a resolved cart.
     */
    @Transactional
    protected CartItem internalAddToCart(Cart cart, Integer productId, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be at least 1.");
        }

        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new IllegalArgumentException("Product not found with ID: " + productId));

        if (!"ACTIVE".equalsIgnoreCase(product.getStatus())) {
            throw new IllegalStateException("Product '" + product.getProductName() + "' is not available.");
        }

        if (product.getStockQuantity() < quantity) {
            throw new IllegalStateException("Only " + product.getStockQuantity() + " unit(s) of '" + product.getProductName() + "' are in stock.");
        }

        Optional<CartItem> existingItem = cartItemRepository.findByCart_CartIDAndProduct_ProductID(cart.getCartID(), productId);

        CartItem cartItem;
        if (existingItem.isPresent()) {
            cartItem = existingItem.get();
            int newQty = cartItem.getQuantity() + quantity;
            if (product.getStockQuantity() < newQty) {
                throw new IllegalStateException("Cannot add more. Only " + product.getStockQuantity() + " unit(s) available.");
            }
            cartItem.setQuantity(newQty);
        } else {
            cartItem = new CartItem();
            cartItem.setCart(cart);
            cartItem.setProduct(product);
            cartItem.setQuantity(quantity);
            cartItem.setPriceAtAddition(product.getUnitPrice());
        }

        cart.setUpdatedAt(LocalDate.now());
        cartRepository.save(cart);

        return cartItemRepository.save(cartItem);
    }

    /** Adds a product to the cart using customer ID. */
    @Transactional
    public CartItem addToCart(Integer customerId, Integer productId, int quantity) {
        Cart cart = getCartByCustomerId(customerId);
        return internalAddToCart(cart, productId, quantity);
    }

    /** 
     * Adds a product to the cart using customer Email.
     * VIVA: Called by the protected /api/cart/add endpoint using JWT Principal.
     */
    @Transactional
    public CartItem addToCartByEmail(String email, Integer productId, int quantity) {
        Cart cart = getCartByCustomerEmail(email);
        return internalAddToCart(cart, productId, quantity);
    }

    /**
     * Updates the quantity of an existing cart item.
     * If quantity is set to 0, the item is removed entirely.
     */
    @Transactional
    public CartItem updateCartItemQuantity(Integer cartItemId, int newQuantity) {
        if (newQuantity < 0) {
            throw new IllegalArgumentException("Quantity cannot be negative.");
        }
        if (newQuantity == 0) {
            removeCartItem(cartItemId);
            return null;
        }

        CartItem item = cartItemRepository.findById(cartItemId)
            .orElseThrow(() -> new IllegalArgumentException("Cart item not found with ID: " + cartItemId));

        if (item.getProduct().getStockQuantity() < newQuantity) {
            throw new IllegalStateException("Only " + item.getProduct().getStockQuantity() + " unit(s) available.");
        }

        item.setQuantity(newQuantity);
        return cartItemRepository.save(item);
    }

    /** Removes a single item from the cart. */
    @Transactional
    public void removeCartItem(Integer cartItemId) {
        if (!cartItemRepository.existsById(cartItemId)) {
            throw new IllegalArgumentException("Cart item not found with ID: " + cartItemId);
        }
        cartItemRepository.deleteById(cartItemId);
    }

    /** Clears all items from a customer's cart. */
    @Transactional
    public void clearCart(Integer cartId) {
        cartItemRepository.deleteByCart_CartID(cartId);
    }

    /** Calculates the total price of all items in a cart. */
    public float calculateCartTotal(Integer cartId) {
        List<CartItem> items = cartItemRepository.findByCart_CartID(cartId);
        return items.stream()
            .map(item -> item.getPriceAtAddition() * item.getQuantity())
            .reduce(0f, Float::sum);
    }

    /**
     * Automated background task to flush abandoned shopping carts.
     * Runs once a day at midnight.
     * Flushes carts that haven't been updated in 7 days.
     */
    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void flushAbandonedCarts() {
        LocalDate threshold = LocalDate.now().minusDays(7);
        List<Cart> abandonedCarts = cartRepository.findByUpdatedAtBefore(threshold);
        for (Cart cart : abandonedCarts) {
            clearCart(cart.getCartID());
        }
    }
}
