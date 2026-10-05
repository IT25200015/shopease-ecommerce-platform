package com.shopease.shopease_backend.repository;

import com.shopease.shopease_backend.model.RefundRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RefundRequestRepository extends JpaRepository<RefundRequest, Integer> {

    // Get all refund requests for a specific transaction
    List<RefundRequest> findByTransaction_TransactionID(Integer transactionID);

    // Get all refund requests by approval status (finance officer view)
    List<RefundRequest> findByAdminApprovalStatus(String status);

    // Get all refunds processed by a specific finance officer
    List<RefundRequest> findByProcessedBy_AccountID(Integer accountID);
}
