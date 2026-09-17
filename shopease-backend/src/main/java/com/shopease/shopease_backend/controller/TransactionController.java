package com.shopease.shopease_backend.controller;

import com.shopease.shopease_backend.dto.TransactionDto;
import com.shopease.shopease_backend.model.Transaction;
import com.shopease.shopease_backend.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    public ResponseEntity<List<TransactionDto>> getAllTransactions() {
        return ResponseEntity.ok(transactionService.getAllTransactionDtos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Transaction> getById(@PathVariable Integer id) {
        return transactionService.getTransactionById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<Transaction> getByOrderId(@PathVariable Integer orderId) {
        return transactionService.getTransactionByOrderId(orderId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Transaction>> getByStatus(@PathVariable String status) {
        return ResponseEntity.ok(transactionService.getByPaymentStatus(status));
    }

    /** PATCH /api/transactions/{id}/status?value=SUCCESS */
    @PatchMapping("/{id}/status")
    public ResponseEntity<Transaction> updateStatus(
            @PathVariable Integer id, @RequestParam String value) {
        return ResponseEntity.ok(transactionService.updatePaymentStatus(id, value));
    }
}
