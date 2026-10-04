package com.shopease.shopease_backend.service;

import com.shopease.shopease_backend.model.RefundRequest;
import com.shopease.shopease_backend.repository.RefundRequestRepository;
import com.shopease.shopease_backend.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RefundRequestService {

    private final RefundRequestRepository refundRequestRepository;
    private final TransactionRepository transactionRepository;

    public List<RefundRequest> getAllRefundRequests() {
        return refundRequestRepository.findAll();
    }

    public Optional<RefundRequest> getRefundRequestById(Integer id) {
        return refundRequestRepository.findById(id);
    }

    public List<RefundRequest> getByStatus(String status) {
        return refundRequestRepository.findByAdminApprovalStatus(status);
    }

    /**
     * Creates a new refund request.
     * Business Rule: The transaction must exist and its payment must be SUCCESS.
     */
    public RefundRequest createRefundRequest(RefundRequest refundRequest) {
        var tx = transactionRepository.findById(refundRequest.getTransaction().getTransactionID())
            .orElseThrow(() -> new IllegalArgumentException("Transaction not found."));

        if (!"SUCCESS".equalsIgnoreCase(tx.getPaymentStatus())) {
            throw new IllegalStateException("Refunds can only be requested for successfully paid transactions.");
        }

        refundRequest.setAdminApprovalStatus("PENDING");
        return refundRequestRepository.save(refundRequest);
    }

    /**
     * Finance Officer approves or rejects a refund.
     */
    public RefundRequest processRefund(Integer refundId, Integer officerId, String decision) {
        RefundRequest refund = refundRequestRepository.findById(refundId)
            .orElseThrow(() -> new IllegalArgumentException("Refund request not found with ID: " + refundId));

        if (!"PENDING".equals(refund.getAdminApprovalStatus())) {
            throw new IllegalStateException("This refund has already been processed.");
        }

        refund.setAdminApprovalStatus(decision); // "APPROVED" or "REJECTED"
        refund.setProcessedDate(LocalDate.now());
        return refundRequestRepository.save(refund);
    }

    public void deleteRefundRequest(Integer id) {
        if (!refundRequestRepository.existsById(id)) {
            throw new IllegalArgumentException("Refund request not found with ID: " + id);
        }
        refundRequestRepository.deleteById(id);
    }
}
