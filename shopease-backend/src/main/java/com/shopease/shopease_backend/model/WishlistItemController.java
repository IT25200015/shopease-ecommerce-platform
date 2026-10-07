package com.shopease.shopease_backend.controller;

import com.shopease.shopease_backend.model.WishlistItem;
import com.shopease.shopease_backend.service.WishlistItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wishlist")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class WishlistItemController {

    private final WishlistItemService wishlistItemService;

    @GetMapping("/account/{accountId}")
    public ResponseEntity<List<WishlistItem>> getWishlist(@PathVariable Integer accountId) {
        return ResponseEntity.ok(wishlistItemService.getWishlistByAccount(accountId));
    }

    /**
     * GET /api/wishlist/check?accountId=1&productId=5
     * Returns { "wishlisted": true/false } — used by the heart toggle button.
     */
    @GetMapping("/check")
    public ResponseEntity<Map<String, Boolean>> checkWishlisted(
            @RequestParam Integer accountId, @RequestParam Integer productId) {
        boolean exists = wishlistItemService.isProductWishlisted(accountId, productId);
        return ResponseEntity.ok(Map.of("wishlisted", exists));
    }

    /**
     * POST /api/wishlist/toggle?accountId=1&productId=5
     * If the product is already wishlisted, it removes it. Otherwise, it adds it.
     * Returns { "wishlisted": true/false } indicating the new state.
     *
     * VIVA DEFENSE: This is an idempotent toggle — the frontend doesn't need to
     * track local state or worry about race conditions. One endpoint handles both
     * add and remove, simplifying the UI logic.
     */
    @PostMapping("/toggle")
    public ResponseEntity<Map<String, Boolean>> toggleWishlist(
            @RequestParam Integer accountId, @RequestParam Integer productId) {
        boolean nowWishlisted = wishlistItemService.toggleWishlist(accountId, productId);
        return ResponseEntity.ok(Map.of("wishlisted", nowWishlisted));
    }

    @PostMapping
    public ResponseEntity<WishlistItem> addToWishlist(@RequestBody WishlistItem item) {
        return ResponseEntity.status(HttpStatus.CREATED).body(wishlistItemService.addToWishlist(item));
    }

    /** DELETE /api/wishlist/account/{accountId}/product/{productId} */
    @DeleteMapping("/account/{accountId}/product/{productId}")
    public ResponseEntity<Void> removeFromWishlist(
            @PathVariable Integer accountId, @PathVariable Integer productId) {
        wishlistItemService.removeFromWishlist(accountId, productId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable Integer id) {
        wishlistItemService.deleteWishlistItem(id);
        return ResponseEntity.noContent().build();
    }
}
