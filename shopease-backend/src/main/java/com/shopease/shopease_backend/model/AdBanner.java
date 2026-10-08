package com.shopease.shopease_backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

/**
 * An advertisement banner created by Marketing Staff or Admin.
 * BUG FIX: Added @EqualsAndHashCode + @ToString exclusions.
 */
@Entity
@Table(name = "ad_banner")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"createdBy"})
public class AdBanner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bannerID")
    @EqualsAndHashCode.Include
    private Integer bannerID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "createdByAccountID", nullable = false)
    @JsonBackReference("account-banners")
    private Account createdBy;

    @Column(name = "imageUrl", nullable = false)
    private String imageUrl;

    @Column(name = "targetUrl")
    private String targetUrl;

    @Column(name = "isActive")
    private Boolean isActive;

    // "HOMEPAGE_TOP", "SIDEBAR", "CATEGORY_PAGE"
    @Column(name = "displayPosition")
    private String displayPosition;
}
