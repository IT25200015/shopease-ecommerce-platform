package com.shopease.shopease_backend.controller;

import com.shopease.shopease_backend.model.Cart;
import com.shopease.shopease_backend.model.CartItem;
import com.shopease.shopease_backend.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * CartController – REST API for Shopping Cart
 * ===========================================
 *
 * VIVA: We've upgraded this controller to use Spring Security's Principal.
 * Instead of passing customerId in the URL (which is insecure, as User A
 * could modify User B's cart by changing the ID), we read the user's email
 * securely from the JWT token via @AuthenticationPrincipal.
 */
@RestController
@RequestMapping("/api/cart")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    // ─── JWT SECURED ENDPOINTS (Uses Logged-in User) ────────────────────────

    /**
     * GET /api/cart
     * Returns the cart items for the currently logged-in user.
     * Accessible by both CUSTOMER and SHOP_OWNER.
     */
    @GetMapping
    public ResponseEntity<List<CartItem>> getMyCart(@AuthenticationPrincipal UserDetails principal) {
        Cart cart = cartService.getCartByCustomerEmail(principal.getUsername());
        return ResponseEntity.ok(cartService.getCartItems(cart.getCartID()));
    }

    /**
     * POST /api/cart/add
     * Body format: ?productId=3&quantity=2
     * Adds an item to the logged-in user's cart.
     */
    @PostMapping("/add")
    public ResponseEntity<CartItem> addToMyCart(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam Integer productId,
            @RequestParam int quantity) {
        
        CartItem item = cartService.addToCartByEmail(principal.getUsername(), productId, quantity);
        return ResponseEntity.status(HttpStatus.CREATED).body(item);
    }

    // ─── LEGACY ENDPOINTS (Still active for backward compat / admin) ─────────

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<Cart> getCart(@PathVariable Integer customerId) {
        return ResponseEntity.ok(cartService.getCartByCustomerId(customerId));
    }

    @GetMapping("/{cartId}/items")
    public ResponseEntity<List<CartItem>> getCartItems(@PathVariable Integer cartId) {
        return ResponseEntity.ok(cartService.getCartItems(cartId));
    }

    @GetMapping("/{cartId}/total")
    public ResponseEntity<Map<String, Float>> getCartTotal(@PathVariable Integer cartId) {
        float total = cartService.calculateCartTotal(cartId);
        return ResponseEntity.ok(Map.of("total", total));
    }

    @PostMapping("/customer/{customerId}/add")
    public ResponseEntity<CartItem> addToCart(
            @PathVariable Integer customerId,
            @RequestParam Integer productId,
            @RequestParam int quantity) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(cartService.addToCart(customerId, productId, quantity));
    }

    @PatchMapping("/items/{cartItemId}/quantity")
    public ResponseEntity<CartItem> updateQuantity(
            @PathVariable Integer cartItemId,
            @RequestParam int value) {
        CartItem updated = cartService.updateCartItemQuantity(cartItemId, value);
        if (updated == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/items/{cartItemId}")
    public ResponseEntity<Void> removeCartItem(@PathVariable Integer cartItemId) {
        cartService.removeCartItem(cartItemId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{cartId}/clear")
    public ResponseEntity<Void> clearCart(@PathVariable Integer cartId) {
        cartService.clearCart(cartId);
        return ResponseEntity.noContent().build();
    }
}
