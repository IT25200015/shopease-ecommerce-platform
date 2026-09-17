package com.shopease.shopease_backend.controller;

import com.shopease.shopease_backend.model.Transaction;
import com.shopease.shopease_backend.service.PaymentService;
import com.shopease.shopease_backend.util.ReceiptGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * PaymentController – REST endpoints for payment processing and receipt download.
 *
 * VIVA: Why is @CrossOrigin removed here?
 *   Same reason as OrderController — @CrossOrigin(origins = "*") conflicts with
 *   SecurityConfig's allowCredentials(true). CORS is handled centrally in
 *   SecurityConfig.corsConfigurationSource(). Having both causes the browser to
 *   block actual XHR requests even after a successful OPTIONS preflight.
 *
 * VIVA: Why no external gateway (Stripe, Razorpay)?
 *   This is a sandbox simulation. In a production system, processPayment()
 *   would call a payment gateway's API and handle webhooks for async confirmation.
 *   For this project, we simulate success if card details pass basic validation.
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * POST /api/payments/process
     *
     * Simulates a payment gateway (Sandbox mode).
     * JWT Secured — CUSTOMER role required (enforced in SecurityConfig).
     *
     * VIVA: Two-step checkout flow:
     *   1. POST /api/orders/checkout  → Creates the Order (status: PENDING)
     *      and a placeholder Transaction (status: PENDING).
     *   2. POST /api/payments/process → Updates the Transaction to SUCCESS
     *      and the Order to CONFIRMED.
     *
     * This mirrors real payment flows: create order first, then charge.
     * If payment fails, the order stays PENDING and can be retried or cancelled.
     */
    @PostMapping("/process")
    public ResponseEntity<Transaction> processPayment(
            @RequestParam Integer orderId,
            @RequestParam String cardNumber,
            @RequestParam String expiry,
            @RequestParam String cvc) {

        Transaction transaction = paymentService.processPayment(orderId, cardNumber, expiry, cvc);
        return ResponseEntity.status(HttpStatus.CREATED).body(transaction);
    }

    /**
     * GET /api/payments/receipt/{transactionId}
     *
     * VIVA: Streams a dynamically generated PDF receipt back to the browser.
     *   Uses iText7 (ReceiptGenerator utility) to build the PDF in memory as a
     *   byte array. The Content-Disposition header instructs the browser to
     *   treat the response as a file download rather than rendering it inline.
     *
     * Accessible by any authenticated user to download their receipts.
     */
    @GetMapping(value = "/receipt/{transactionId}", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadReceipt(@PathVariable Integer transactionId) {
        Transaction transaction = paymentService.getTransactionById(transactionId);
        byte[] pdfBytes = ReceiptGenerator.generateReceipt(transaction);

        if (pdfBytes == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "SHOPEase_Receipt_" + transactionId + ".pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }

    /**
     * PATCH /api/payments/{id}/archive
     * Soft deletes a transaction.
     */
    @PatchMapping("/{id}/archive")
    public ResponseEntity<Transaction> archiveTransaction(@PathVariable Integer id) {
        return ResponseEntity.ok(paymentService.archiveTransaction(id));
    }
}
