package com.shopease.shopease_backend.service;

import com.shopease.shopease_backend.model.Orders;
import com.shopease.shopease_backend.model.Transaction;
import com.shopease.shopease_backend.repository.OrdersRepository;
import com.shopease.shopease_backend.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final OrdersRepository ordersRepository;
    private final TransactionRepository transactionRepository;

    /**
     * VIVA: Simulates processing a payment through a Sandbox Gateway.
     * In a real application, this would call Stripe, Razorpay, or PayPal APIs.
     * Here, we simulate a successful payment if card details are provided.
     */
    @Transactional
    public Transaction processPayment(Integer orderId, String cardNumber, String expiry, String cvc) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        if (!"PENDING".equalsIgnoreCase(order.getOrderStatus())) {
            throw new IllegalStateException("Order is not in PENDING status. Current status: " + order.getOrderStatus());
        }

        // Basic Sandbox Validation (Simulated)
        if (cardNumber == null || cardNumber.length() < 12) {
            throw new IllegalArgumentException("Invalid card number. Sandbox requires at least 12 digits.");
        }

        // Checkout already creates the transaction row in PENDING state.
        // Payment should update that same row to avoid violating the one-to-one
        // unique constraint on orderID.
        Transaction transaction = transactionRepository.findByOrder_OrderID(orderId)
                .orElseGet(Transaction::new);

        transaction.setOrder(order);
        transaction.setNetAmount(order.getGrossTotal());
        transaction.setPaymentMethod("CREDIT_CARD"); // Simulated
        transaction.setPaymentStatus("SUCCESS");
        transaction.setTimestamp(LocalDate.now());

        // Update the order status to indicate payment was successful
        order.setOrderStatus("CONFIRMED");
        ordersRepository.save(order);

        return transactionRepository.save(transaction);
    }
    
    public Transaction getTransactionById(Integer id) {
        return transactionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
    }

    /** Soft delete */
    public Transaction archiveTransaction(Integer id) {
        Transaction tx = transactionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Transaction not found with ID: " + id));
        tx.setIsArchived(true);
        return transactionRepository.save(tx);
    }
}
