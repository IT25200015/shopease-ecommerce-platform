package com.shopease.shopease_backend.controller;

import com.shopease.shopease_backend.model.UserProfile;
import com.shopease.shopease_backend.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/profiles")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    @GetMapping
    public ResponseEntity<List<UserProfile>> getAllProfiles() {
        return ResponseEntity.ok(userProfileService.getAllProfiles());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserProfile> getProfileById(@PathVariable Integer id) {
        return userProfileService.getProfileById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/account/{accountId}")
    public ResponseEntity<UserProfile> getProfileByAccount(@PathVariable Integer accountId) {
        return userProfileService.getProfileByAccountId(accountId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<UserProfile> saveProfile(@RequestBody UserProfile profile) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userProfileService.saveProfile(profile));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserProfile> updateProfile(@PathVariable Integer id, @RequestBody UserProfile profile) {
        profile.setProfileID(id);
        return ResponseEntity.ok(userProfileService.saveProfile(profile));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProfile(@PathVariable Integer id) {
        userProfileService.deleteProfile(id);
        return ResponseEntity.noContent().build();
    }
}
