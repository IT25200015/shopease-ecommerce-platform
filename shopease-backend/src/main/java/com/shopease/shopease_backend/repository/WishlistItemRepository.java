package com.shopease.shopease_backend.repository;

import com.shopease.shopease_backend.model.WishlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistItemRepository extends JpaRepository<WishlistItem, Integer> {

    // Get all wishlist items for a specific customer
    List<WishlistItem> findByAccount_AccountID(Integer accountID);

    // Check if a product is already in the customer's wishlist
    Optional<WishlistItem> findByAccount_AccountIDAndProduct_ProductID(Integer accountID, Integer productID);

    // Remove a specific product from a customer's wishlist
    void deleteByAccount_AccountIDAndProduct_ProductID(Integer accountID, Integer productID);
}
