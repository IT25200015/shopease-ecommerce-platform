package com.shopease.shopease_backend.controller;

import com.shopease.shopease_backend.model.AdBanner;
import com.shopease.shopease_backend.model.Account;
import com.shopease.shopease_backend.service.AdBannerService;
import com.shopease.shopease_backend.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/banners")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AdBannerController {

    private final AdBannerService adBannerService;
    private final AccountService accountService;

    @GetMapping
    public ResponseEntity<List<AdBanner>> getAllBanners() {
        return ResponseEntity.ok(adBannerService.getAllBanners());
    }

    @GetMapping("/active")
    public ResponseEntity<List<AdBanner>> getActiveBanners() {
        return ResponseEntity.ok(adBannerService.getActiveBanners());
    }

    /** GET /api/banners/active/position?pos=HOMEPAGE_TOP */
    @GetMapping("/active/position")
    public ResponseEntity<List<AdBanner>> getByPosition(@RequestParam String pos) {
        return ResponseEntity.ok(adBannerService.getActiveBannersByPosition(pos));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdBanner> getById(@PathVariable Integer id) {
        return adBannerService.getBannerById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MARKETING_EXEC', 'ADMIN')")
    public ResponseEntity<AdBanner> createBanner(@RequestBody AdBanner banner, Principal principal) {
        Account userAccount = accountService.getAccountByEmail(principal.getName())
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        banner.setCreatedBy(userAccount);
        return ResponseEntity.status(HttpStatus.CREATED).body(adBannerService.createBanner(banner));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MARKETING_EXEC', 'ADMIN')")
    public ResponseEntity<AdBanner> updateBanner(@PathVariable Integer id, @RequestBody AdBanner banner) {
        return ResponseEntity.ok(adBannerService.updateBanner(id, banner));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MARKETING_EXEC', 'ADMIN')")
    public ResponseEntity<Void> deleteBanner(@PathVariable Integer id) {
        adBannerService.deleteBanner(id);
        return ResponseEntity.noContent().build();
    }
}
