package com.shopease.shopease_backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * A refund request raised against a Transaction.
 * BUG FIX: Added @EqualsAndHashCode + @ToString exclusions.
 */
@Entity
@Table(name = "refund_request")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"transaction", "processedBy"})
public class RefundRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "refundID")
    @EqualsAndHashCode.Include
    private Integer refundID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transactionID", nullable = false)
    @JsonBackReference("transaction-refunds")
    private Transaction transaction;

    // The Finance Officer who processed this refund (nullable until processed)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processedByAccountID", nullable = true)
    @JsonBackReference("account-refunds")
    private Account processedBy;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    // "PENDING", "APPROVED", "REJECTED"
    @Column(name = "adminApprovalStatus", nullable = false)
    private String adminApprovalStatus;

    @Column(name = "processedDate")
    private LocalDate processedDate;
}
