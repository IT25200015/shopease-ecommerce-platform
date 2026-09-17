package com.shopease.shopease_backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Records payment details for an Order (OneToOne).
 * BUG FIX: Added @EqualsAndHashCode + @ToString exclusions.
 */
@Entity
@Table(name = "transaction")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"order", "refundRequests"})
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transactionID")
    @EqualsAndHashCode.Include
    private Integer transactionID;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "orderID", nullable = false, unique = true)
    @JsonBackReference("order-transaction")
    private Orders order;

    @Column(name = "netAmount", nullable = false)
    private Float netAmount;

    // "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "CASH_ON_DELIVERY"
    @Column(name = "paymentMethod", nullable = false)
    private String paymentMethod;

    // "PENDING", "SUCCESS", "FAILED", "REFUNDED"
    @Column(name = "paymentStatus", nullable = false)
    private String paymentStatus;

    @Column(name = "timestamp")
    private LocalDate timestamp;

    @OneToMany(mappedBy = "transaction", cascade = CascadeType.ALL)
    @JsonManagedReference("transaction-refunds")
    private List<RefundRequest> refundRequests;

    @Column(name = "isArchived")
    private Boolean isArchived;
}
