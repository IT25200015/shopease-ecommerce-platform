package com.shopease.shopease_backend.repository;

import com.shopease.shopease_backend.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Integer> {

    // Find an account by email — used for login
    Optional<Account> findByEmail(String email);

    // Check if an email is already registered — used for signup validation
    boolean existsByEmail(String email);

    // Find all accounts by their role
    java.util.List<Account> findByRole(String role);

    // Find all accounts by their status
    java.util.List<Account> findByStatus(String status);
}
