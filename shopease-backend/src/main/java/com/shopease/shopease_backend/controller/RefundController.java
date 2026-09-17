package com.shopease.shopease_backend.controller;

import com.shopease.shopease_backend.dto.RefundDto;
import com.shopease.shopease_backend.model.RefundRequest;
import com.shopease.shopease_backend.service.RefundService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/refunds")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class RefundController {

    private final RefundService refundService;

    /**
     * POST /api/refunds/request
     * Customer requests a refund. Secured via JWT email.
     */
    @PostMapping("/request")
    public ResponseEntity<RefundDto> requestRefund(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam Integer transactionId,
            @RequestParam String reason) {
        RefundDto request = refundService.requestRefund(principal.getUsername(), transactionId, reason);
        return ResponseEntity.status(HttpStatus.CREATED).body(request);
    }

    /**
     * GET /api/refunds/pending
     * Finance Dashboard fetches all pending refunds.
     */
    @GetMapping("/pending")
    @PreAuthorize("hasRole('FINANCE_OFFICER')")
    public ResponseEntity<List<RefundDto>> getPendingRefunds() {
        return ResponseEntity.ok(refundService.getPendingRefunds());
    }

    /**
     * PATCH /api/refunds/{id}/process
     * Finance Officer approves or declines the refund.
     */
    @PatchMapping("/{id}/process")
    @PreAuthorize("hasRole('FINANCE_OFFICER')")
    public ResponseEntity<RefundDto> processRefund(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Integer id,
            @RequestParam String status) {
        RefundDto processed = refundService.processRefund(id, status, principal.getUsername());
        return ResponseEntity.ok(processed);
    }
}
