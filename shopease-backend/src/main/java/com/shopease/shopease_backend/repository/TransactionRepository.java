package com.shopease.shopease_backend.repository;

import com.shopease.shopease_backend.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Integer> {

    // Get the transaction for a specific order
    Optional<Transaction> findByOrder_OrderID(Integer orderID);

    // Get all transactions by payment status (admin/finance view)
    List<Transaction> findByPaymentStatus(String paymentStatus);

    // Get all transactions by payment method (analytics)
    List<Transaction> findByPaymentMethod(String paymentMethod);

    // Get all non-archived transactions
    List<Transaction> findByIsArchivedFalseOrIsArchivedIsNull();
}
