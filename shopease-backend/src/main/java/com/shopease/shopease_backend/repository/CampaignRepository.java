package com.shopease.shopease_backend.repository;

import com.shopease.shopease_backend.model.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CampaignRepository extends JpaRepository<Campaign, Integer> {

    // Validate a promo code at checkout
    Optional<Campaign> findByPromoCode(String promoCode);

    // Get all campaigns for a specific shop
    List<Campaign> findByShop_ShopID(Integer shopID);

    // Get all currently active campaigns
    List<Campaign> findByIsActiveTrue();

    // Get active campaigns for a specific shop
    List<Campaign> findByShop_ShopIDAndIsActiveTrue(Integer shopID);
}
