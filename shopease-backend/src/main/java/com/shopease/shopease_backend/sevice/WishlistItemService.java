package com.shopease.shopease_backend.service;

import com.shopease.shopease_backend.model.Account;
import com.shopease.shopease_backend.model.Product;
import com.shopease.shopease_backend.model.WishlistItem;
import com.shopease.shopease_backend.repository.WishlistItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class WishlistItemService {

    private final WishlistItemRepository wishlistItemRepository;

    public List<WishlistItem> getWishlistByAccount(Integer accountId) {
        return wishlistItemRepository.findByAccount_AccountID(accountId);
    }

    /**
     * Checks if a specific product is already in the customer's wishlist.
     */
    public boolean isProductWishlisted(Integer accountId, Integer productId) {
        return wishlistItemRepository
            .findByAccount_AccountIDAndProduct_ProductID(accountId, productId)
            .isPresent();
    }

    /**
     * Toggles a product in/out of the wishlist.
     * If the product is already wishlisted → removes it and returns false.
     * If the product is NOT wishlisted → adds it and returns true.
     *
     * VIVA DEFENSE: This is an atomic toggle operation. The frontend sends
     * one request and gets back the new state, avoiding stale UI issues.
     */
    @Transactional
    public boolean toggleWishlist(Integer accountId, Integer productId) {
        Optional<WishlistItem> existing =
            wishlistItemRepository.findByAccount_AccountIDAndProduct_ProductID(accountId, productId);

        if (existing.isPresent()) {
            // Already wishlisted → remove it
            wishlistItemRepository.delete(existing.get());
            return false; // No longer wishlisted
        } else {
            // Not wishlisted → add it
            WishlistItem item = new WishlistItem();
            Account acc = new Account();
            acc.setAccountID(accountId);
            item.setAccount(acc);
            Product prod = new Product();
            prod.setProductID(productId);
            item.setProduct(prod);
            item.setAddedAt(LocalDate.now());
            wishlistItemRepository.save(item);
            return true; // Now wishlisted
        }
    }

    /**
     * Adds a product to wishlist.
     * Business Rule: silently ignores duplicates (idempotent add).
     */
    @Transactional
    public WishlistItem addToWishlist(WishlistItem item) {
        // Idempotent: if already wishlisted, just return the existing one
        return wishlistItemRepository
            .findByAccount_AccountIDAndProduct_ProductID(
                item.getAccount().getAccountID(), item.getProduct().getProductID())
            .orElseGet(() -> {
                item.setAddedAt(LocalDate.now());
                return wishlistItemRepository.save(item);
            });
    }

    @Transactional
    public void removeFromWishlist(Integer accountId, Integer productId) {
        wishlistItemRepository.deleteByAccount_AccountIDAndProduct_ProductID(accountId, productId);
    }

    public void deleteWishlistItem(Integer id) {
        if (!wishlistItemRepository.existsById(id)) {
            throw new IllegalArgumentException("Wishlist item not found with ID: " + id);
        }
        wishlistItemRepository.deleteById(id);
    }
}
