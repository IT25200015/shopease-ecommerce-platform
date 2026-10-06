package com.shopease.shopease_backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

/**
 * A promotional campaign / promo code.
 * BUG FIX: Added @EqualsAndHashCode + @ToString exclusions.
 */
@Entity
@Table(name = "campaign")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"shop", "orders"})
public class Campaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "campaignID")
    @EqualsAndHashCode.Include
    private Integer campaignID;

    // Nullable: null = platform-wide campaign (not shop-specific)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shopID", nullable = true)
    @JsonBackReference("shop-campaigns")
    private Shop shop;

    @Column(name = "promoCode", nullable = false, unique = true)
    private String promoCode;

    @Column(name = "discountValue", nullable = false)
    private Float discountValue;

    @Column(name = "expiryDate")
    private LocalDate expiryDate;

    // "PERCENTAGE" or "FIXED_AMOUNT"
    @Column(name = "discountType")
    private String discountType;

    @Column(name = "minimumSpend")
    private Float minimumSpend;

    @Column(name = "actualUsageCount")
    private Integer actualUsageCount = 0;

    @Column(name = "generatedRevenue")
    private Float generatedRevenue = 0.0f;

    @Column(name = "usageLimit")
    private Integer usageLimit;

    @Column(name = "isActive")
    private Boolean isActive;

    @OneToMany(mappedBy = "campaign", cascade = CascadeType.ALL)
    @JsonManagedReference("campaign-orders")
    private List<Orders> orders;
}
