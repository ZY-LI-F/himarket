package com.alibaba.himarket.controller.agent;

import com.alibaba.himarket.security.HmacSignatureVerifier;
import com.alibaba.himarket.service.agent.AgentEventIngestService;
import com.alibaba.himarket.service.agent.AgentEventIngestService.IngestResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/agent/events")
public class AgentInternalWebhookController {

    static final String SIGNATURE_HEADER = "X-Hiclaw-Signature";
    static final String IDEMPOTENCY_HEADER = "X-Idempotency-Key";

    private final AgentEventIngestService eventIngestService;
    private final HmacSignatureVerifier signatureVerifier;
    private final String webhookSecret;

    public AgentInternalWebhookController(
            AgentEventIngestService eventIngestService,
            HmacSignatureVerifier signatureVerifier,
            @Value("${hiclaw.bridge.webhook-secret:dev-secret}") String webhookSecret) {
        if (!StringUtils.hasText(webhookSecret)) {
            throw new IllegalArgumentException("hiclaw.bridge.webhook-secret must not be blank");
        }
        this.eventIngestService = eventIngestService;
        this.signatureVerifier = signatureVerifier;
        this.webhookSecret = webhookSecret;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> receive(
            @RequestBody byte[] body,
            @RequestHeader(name = SIGNATURE_HEADER, required = false) String signature,
            @RequestHeader(name = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {
        if (!signatureVerifier.verify(body, signature, webhookSecret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        IngestResult result = eventIngestService.ingest(body, idempotencyKey);
        if (result.duplicate()) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.accepted().build();
    }
}
