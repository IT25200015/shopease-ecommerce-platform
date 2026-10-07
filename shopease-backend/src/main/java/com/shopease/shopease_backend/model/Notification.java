package com.shopease.shopease_backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * A notification sent to an Account.
 * BUG FIX: Added @EqualsAndHashCode + @ToString exclusions.
 */
@Entity
@Table(name = "notification")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"account"})
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notificationID")
    @EqualsAndHashCode.Include
    private Integer notificationID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accountID", nullable = false)
    @JsonBackReference("account-notifications")
    private Account account;

    // "EMAIL", "SMS", "IN_APP"
    @Column(name = "channel", nullable = false)
    private String channel;

    // "ORDER_UPDATE", "PROMO", "SYSTEM_ALERT", "REFUND_STATUS"
    @Column(name = "type", nullable = false)
    private String type;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "sentAt")
    private LocalDate sentAt;

    // "SENT", "FAILED", "PENDING"
    @Column(name = "status", nullable = false)
    private String status;
}
