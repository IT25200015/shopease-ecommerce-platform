package com.shopease.shopease_backend.controller;

import com.shopease.shopease_backend.model.RefundRequest;
import com.shopease.shopease_backend.service.RefundRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/refunds")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class RefundRequestController {

    private final RefundRequestService refundRequestService;

    @GetMapping
    public ResponseEntity<List<RefundRequest>> getAllRefunds() {
        return ResponseEntity.ok(refundRequestService.getAllRefundRequests());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RefundRequest> getById(@PathVariable Integer id) {
        return refundRequestService.getRefundRequestById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<RefundRequest>> getByStatus(@PathVariable String status) {
        return ResponseEntity.ok(refundRequestService.getByStatus(status));
    }

    /** POST /api/refunds — customer submits a refund request */
    @PostMapping
    public ResponseEntity<RefundRequest> createRefund(@RequestBody RefundRequest refundRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(refundRequestService.createRefundRequest(refundRequest));
    }



    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRefund(@PathVariable Integer id) {
        refundRequestService.deleteRefundRequest(id);
        return ResponseEntity.noContent().build();
    }
}
