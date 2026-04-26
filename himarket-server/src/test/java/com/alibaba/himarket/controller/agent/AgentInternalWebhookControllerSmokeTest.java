package com.alibaba.himarket.controller.agent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alibaba.himarket.security.HmacSignatureVerifier;
import com.alibaba.himarket.service.agent.AgentEventIngestService;
import com.alibaba.himarket.service.agent.AgentEventIngestService.IngestResult;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AgentInternalWebhookController.class)
@Import({
    HmacSignatureVerifier.class,
    AgentInternalWebhookControllerSmokeTest.TestSecurityConfig.class
})
@TestPropertySource(properties = "hiclaw.bridge.webhook-secret=top-secret")
class AgentInternalWebhookControllerSmokeTest {

    private static final String IDEMPOTENCY_KEY = "room-123:$event-1";
    private static final String BODY =
            "{\"seq\":3,\"kind\":\"task.completed\","
                    + "\"payload\":{\"task_id\":\"task-1\",\"status\":\"completed\"},"
                    + "\"agentId\":\"worker-dev\",\"timestamp\":\"2026-04-26T10:30:00Z\"}";

    @Autowired private MockMvc mockMvc;
    @Autowired private HmacSignatureVerifier signatureVerifier;
    @MockBean private AgentEventIngestService eventIngestService;

    @Test
    void validSignatureDelegatesToIngestServiceForPersistenceAndFanout() throws Exception {
        when(eventIngestService.ingest(any(byte[].class), eq(IDEMPOTENCY_KEY)))
                .thenReturn(IngestResult.accepted("task-1"));

        mockMvc.perform(
                        post("/internal/agent/events")
                                .contentType(MediaType.APPLICATION_JSON)
                                .header(
                                        AgentInternalWebhookController.SIGNATURE_HEADER,
                                        signature(BODY))
                                .header(
                                        AgentInternalWebhookController.IDEMPOTENCY_HEADER,
                                        IDEMPOTENCY_KEY)
                                .content(BODY))
                .andExpect(status().isAccepted());

        ArgumentCaptor<byte[]> bodyCaptor = ArgumentCaptor.forClass(byte[].class);
        verify(eventIngestService).ingest(bodyCaptor.capture(), eq(IDEMPOTENCY_KEY));
        assertThat(new String(bodyCaptor.getValue(), StandardCharsets.UTF_8)).isEqualTo(BODY);
    }

    @Test
    void invalidSignatureReturnsUnauthorizedWithoutIngesting() throws Exception {
        mockMvc.perform(
                        post("/internal/agent/events")
                                .contentType(MediaType.APPLICATION_JSON)
                                .header(
                                        AgentInternalWebhookController.SIGNATURE_HEADER,
                                        "sha256=bad")
                                .header(
                                        AgentInternalWebhookController.IDEMPOTENCY_HEADER,
                                        IDEMPOTENCY_KEY)
                                .content(BODY))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(eventIngestService);
    }

    @Test
    void duplicateIdempotencyKeyReturnsOkNoop() throws Exception {
        when(eventIngestService.ingest(any(byte[].class), eq(IDEMPOTENCY_KEY)))
                .thenReturn(IngestResult.duplicate("task-1"));

        mockMvc.perform(
                        post("/internal/agent/events")
                                .contentType(MediaType.APPLICATION_JSON)
                                .header(
                                        AgentInternalWebhookController.SIGNATURE_HEADER,
                                        signature(BODY))
                                .header(
                                        AgentInternalWebhookController.IDEMPOTENCY_HEADER,
                                        IDEMPOTENCY_KEY)
                                .content(BODY))
                .andExpect(status().isOk());
    }

    private String signature(String body) {
        return signatureVerifier.sign(body.getBytes(StandardCharsets.UTF_8), "top-secret");
    }

    @TestConfiguration
    static class TestSecurityConfig {

        @Bean
        SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
            return http.securityMatcher("/internal/**")
                    .csrf(AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                    .build();
        }
    }
}
