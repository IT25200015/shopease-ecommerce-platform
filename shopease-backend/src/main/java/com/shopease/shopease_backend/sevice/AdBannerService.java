package com.shopease.shopease_backend.service;

import com.shopease.shopease_backend.model.AdBanner;
import com.shopease.shopease_backend.repository.AdBannerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AdBannerService {

    private final AdBannerRepository adBannerRepository;

    public List<AdBanner> getAllBanners() {
        return adBannerRepository.findAll();
    }

    public List<AdBanner> getActiveBanners() {
        return adBannerRepository.findByIsActiveTrue();
    }

    public List<AdBanner> getActiveBannersByPosition(String position) {
        return adBannerRepository.findByDisplayPositionAndIsActiveTrue(position);
    }

    public Optional<AdBanner> getBannerById(Integer id) {
        return adBannerRepository.findById(id);
    }

    public AdBanner createBanner(AdBanner banner) {
        if (banner.getIsActive() == null) banner.setIsActive(true);
        return adBannerRepository.save(banner);
    }

    public AdBanner updateBanner(Integer id, AdBanner updatedData) {
        AdBanner existing = adBannerRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Banner not found with ID: " + id));
        existing.setImageUrl(updatedData.getImageUrl());
        existing.setTargetUrl(updatedData.getTargetUrl());
        existing.setIsActive(updatedData.getIsActive());
        existing.setDisplayPosition(updatedData.getDisplayPosition());
        return adBannerRepository.save(existing);
    }

    public void deleteBanner(Integer id) {
        if (!adBannerRepository.existsById(id)) {
            throw new IllegalArgumentException("Banner not found with ID: " + id);
        }
        adBannerRepository.deleteById(id);
    }
}
