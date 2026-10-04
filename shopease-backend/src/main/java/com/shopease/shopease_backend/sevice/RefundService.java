package com.shopease.shopease_backend.service;

import com.shopease.shopease_backend.dto.RefundDto;
import com.shopease.shopease_backend.model.Account;
import com.shopease.shopease_backend.model.RefundRequest;
import com.shopease.shopease_backend.model.Transaction;
import com.shopease.shopease_backend.repository.AccountRepository;
import com.shopease.shopease_backend.repository.RefundRequestRepository;
import com.shopease.shopease_backend.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RefundService {

    private final RefundRequestRepository refundRequestRepository;
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;

    /**
     * Customer requests a refund for a successful transaction.
     */
    @Transactional
    public RefundDto requestRefund(String email, Integer transactionId, String reason) {
        Transaction transaction = transactionRepository.findById(transactionId)
            .orElseThrow(() -> new IllegalArgumentException("Transaction not found."));

        // Validate ownership
        if (!transaction.getOrder().getCustomer().getEmail().equals(email)) {
            throw new SecurityException("You do not have permission to request a refund for this transaction.");
        }

        // Validate status
        if (!"SUCCESS".equals(transaction.getPaymentStatus())) {
            throw new IllegalStateException("Only SUCCESSFUL transactions can be refunded.");
        }

        RefundRequest request = new RefundRequest();
        request.setTransaction(transaction);
        request.setReason(reason);
        request.setAdminApprovalStatus("PENDING");
        return mapToDto(refundRequestRepository.save(request));
    }

    /**
     * VIVA: Finance Officer gets all pending refunds to review.
     */
    public List<RefundDto> getPendingRefunds() {
        return refundRequestRepository.findAll().stream()
            .filter(r -> "PENDING".equals(r.getAdminApprovalStatus()))
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }

    /**
     * VIVA: Finance Officer approves or declines the refund.
     */
    @Transactional
    public RefundDto processRefund(Integer refundId, String status, String adminEmail) {
        RefundRequest refund = refundRequestRepository.findById(refundId)
            .orElseThrow(() -> new IllegalArgumentException("Refund request not found."));

        if (!"PENDING".equals(refund.getAdminApprovalStatus())) {
            throw new IllegalStateException("Refund has already been processed.");
        }

        Account admin = accountRepository.findByEmail(adminEmail)
            .orElseThrow(() -> new IllegalArgumentException("Admin account not found."));

        refund.setAdminApprovalStatus(status.toUpperCase()); // APPROVED or REJECTED
        refund.setProcessedBy(admin);
        refund.setProcessedDate(LocalDate.now());

        if ("APPROVED".equalsIgnoreCase(status)) {
            Transaction tx = refund.getTransaction();
            tx.setPaymentStatus("REFUNDED");
            transactionRepository.save(tx);
        }

        return mapToDto(refundRequestRepository.save(refund));
    }

    private RefundDto mapToDto(RefundRequest req) {
        RefundDto dto = new RefundDto();
        dto.setRefundID(req.getRefundID());
        dto.setReason(req.getReason());
        dto.setStatus(req.getAdminApprovalStatus());
        dto.setProcessedDate(req.getProcessedDate());
        if (req.getTransaction() != null) {
            dto.setTransactionID(req.getTransaction().getTransactionID());
            dto.setAmount(req.getTransaction().getNetAmount());
            if (req.getTransaction().getOrder() != null) {
                dto.setOrderID(req.getTransaction().getOrder().getOrderID());
                if (req.getTransaction().getOrder().getCustomer() != null) {
                    dto.setCustomerName(req.getTransaction().getOrder().getCustomer().getFullName());
                }
            }
        }
        return dto;
    }
}
