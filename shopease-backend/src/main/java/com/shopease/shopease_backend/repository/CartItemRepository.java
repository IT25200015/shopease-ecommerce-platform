package com.shopease.shopease_backend.repository;

import com.shopease.shopease_backend.model.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Integer> {

    // Get all items inside a specific cart
    List<CartItem> findByCart_CartID(Integer cartID);

    // Find a specific product in a specific cart (to check before adding duplicates)
    Optional<CartItem> findByCart_CartIDAndProduct_ProductID(Integer cartID, Integer productID);

    // Remove all items from a cart (on order placement)
    void deleteByCart_CartID(Integer cartID);
}
