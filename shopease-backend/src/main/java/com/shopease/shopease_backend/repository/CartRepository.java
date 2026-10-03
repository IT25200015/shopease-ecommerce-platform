package com.shopease.shopease_backend.repository;

import com.shopease.shopease_backend.model.Cart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartRepository extends JpaRepository<Cart, Integer> {

    // Find the cart belonging to a specific customer ID
    Optional<Cart> findByCustomer_AccountID(Integer customerID);

    // Find the cart belonging to a customer by their email (useful for JWT principal)
    Optional<Cart> findByCustomer_Email(String email);

    // Find carts that have not been updated since a specific date
    java.util.List<Cart> findByUpdatedAtBefore(java.time.LocalDate date);
}
