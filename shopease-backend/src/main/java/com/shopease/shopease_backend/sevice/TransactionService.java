package com.shopease.shopease_backend.service;

import com.shopease.shopease_backend.dto.TransactionDto;

import com.shopease.shopease_backend.model.Transaction;
import com.shopease.shopease_backend.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;

    public List<Transaction> getAllTransactions() {
        return transactionRepository.findByIsArchivedFalseOrIsArchivedIsNull();
    }

    public List<TransactionDto> getAllTransactionDtos() {
        return getAllTransactions().stream()
            .map(this::mapToDto)
            .toList();
    }

    private TransactionDto mapToDto(Transaction tx) {
        TransactionDto dto = new TransactionDto();
        dto.setTransactionID(tx.getTransactionID());
        dto.setNetAmount(tx.getNetAmount());
        dto.setPaymentMethod(tx.getPaymentMethod());
        dto.setPaymentStatus(tx.getPaymentStatus());
        dto.setTimestamp(tx.getTimestamp());
        dto.setIsArchived(tx.getIsArchived());
        if (tx.getOrder() != null) {
            dto.setOrderID(tx.getOrder().getOrderID());
            if (tx.getOrder().getCustomer() != null) {
                dto.setCustomerName(tx.getOrder().getCustomer().getFullName());
            }
        }
        return dto;
    }

    public Optional<Transaction> getTransactionById(Integer id) {
        return transactionRepository.findById(id);
    }

    public Optional<Transaction> getTransactionByOrderId(Integer orderId) {
        return transactionRepository.findByOrder_OrderID(orderId);
    }

    public List<Transaction> getByPaymentStatus(String status) {
        return transactionRepository.findByPaymentStatus(status);
    }

    /**
     * Updates the payment status of a transaction.
     * Used by the Finance Officer after confirming payment gateway response.
     */
    public Transaction updatePaymentStatus(Integer id, String newStatus) {
        Transaction tx = transactionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Transaction not found with ID: " + id));
        tx.setPaymentStatus(newStatus);
        return transactionRepository.save(tx);
    }

    public void deleteTransaction(Integer id) {
        if (!transactionRepository.existsById(id)) {
            throw new IllegalArgumentException("Transaction not found with ID: " + id);
        }
        transactionRepository.deleteById(id);
    }

    /** Soft delete */
    public Transaction archiveTransaction(Integer id) {
        Transaction tx = transactionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Transaction not found with ID: " + id));
        tx.setIsArchived(true);
        return transactionRepository.save(tx);
    }
}
