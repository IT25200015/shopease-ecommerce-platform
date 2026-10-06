package com.shopease.shopease_backend.controller;

import com.shopease.shopease_backend.model.Campaign;
import com.shopease.shopease_backend.service.CampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/campaigns")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class CampaignController {

    private final CampaignService campaignService;

    @GetMapping
    public ResponseEntity<List<Campaign>> getAllCampaigns() {
        return ResponseEntity.ok(campaignService.getAllCampaigns());
    }

    @GetMapping("/active")
    public ResponseEntity<List<Campaign>> getActiveCampaigns() {
        return ResponseEntity.ok(campaignService.getActiveCampaigns());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Campaign> getById(@PathVariable Integer id) {
        return campaignService.getCampaignById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<List<Campaign>> getByShop(@PathVariable Integer shopId) {
        return ResponseEntity.ok(campaignService.getCampaignsByShop(shopId));
    }

    /** GET /api/campaigns/validate?code=SAVE10 — validate a promo code at checkout */
    @GetMapping("/validate")
    public ResponseEntity<Campaign> validatePromoCode(@RequestParam String code) {
        return ResponseEntity.ok(campaignService.validatePromoCode(code));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MARKETING_EXEC', 'ADMIN')")
    public ResponseEntity<Campaign> createCampaign(@RequestBody Campaign campaign) {
        return ResponseEntity.status(HttpStatus.CREATED).body(campaignService.createCampaign(campaign));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MARKETING_EXEC', 'ADMIN')")
    public ResponseEntity<Campaign> updateCampaign(@PathVariable Integer id, @RequestBody Campaign campaign) {
        return ResponseEntity.ok(campaignService.updateCampaign(id, campaign));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MARKETING_EXEC', 'ADMIN')")
    public ResponseEntity<Void> deleteCampaign(@PathVariable Integer id) {
        campaignService.deleteCampaign(id);
        return ResponseEntity.noContent().build();
    }
}
