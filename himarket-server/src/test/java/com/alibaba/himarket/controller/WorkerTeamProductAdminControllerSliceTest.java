package com.alibaba.himarket.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alibaba.himarket.controller.admin.WorkerTeamProductAdminController;
import com.alibaba.himarket.controller.portal.WorkerTeamProductPortalController;
import com.alibaba.himarket.core.advice.ExceptionAdvice;
import com.alibaba.himarket.core.advice.ResponseAdvice;
import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.dto.params.worker.UpsertWorkerTeamProductParam;
import com.alibaba.himarket.dto.result.common.PageResult;
import com.alibaba.himarket.dto.result.worker.WorkerTeamProductMemberResult;
import com.alibaba.himarket.dto.result.worker.WorkerTeamProductResult;
import com.alibaba.himarket.service.WorkerTeamProductService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(
        controllers = {
            WorkerTeamProductAdminController.class,
            WorkerTeamProductPortalController.class
        })
@Import({
    ResponseAdvice.class,
    ExceptionAdvice.class,
    WorkerTeamProductAdminControllerSliceTest.TestSecurityConfig.class
})
class WorkerTeamProductAdminControllerSliceTest {

    private static final String BODY =
            "{\"productId\":\"team-product-1\",\"name\":\"Support Team\",\"version\":\"1.0.0\","
                    + "\"businessDomain\":\"support\",\"description\":\"Handles support\","
                    + "\"status\":\"online\",\"visibility\":\"public\","
                    + "\"pricing\":{\"plan\":\"free\"},\"tags\":[\"support\",\"ai\"],"
                    + "\"members\":[{\"role\":\"leader\",\"refName\":\"triage-worker\","
                    + "\"refVersion\":\"1.0.0\",\"ordinal\":1}]}";

    @Autowired private MockMvc mockMvc;

    @Autowired private ObjectMapper objectMapper;

    @MockBean private WorkerTeamProductService service;

    @BeforeEach
    void setUp() {
        WorkerTeamProductResult product = product("team-product-1");
        when(service.listWorkerTeamProducts(any()))
                .thenReturn(PageResult.of(List.of(product), 0, 20, 1));
        when(service.upsertWorkerTeamProduct(any(UpsertWorkerTeamProductParam.class)))
                .thenReturn(product);
        when(service.getWorkerTeamProduct(eq("team-product-1"))).thenReturn(product);
        when(service.getWorkerTeamProduct(eq("missing")))
                .thenThrow(
                        new BusinessException(ErrorCode.NOT_FOUND, "WorkerTeamProduct", "missing"));
    }

    @Test
    void adminEndpointsReturnCreatedOkAndNotFoundShapes() throws Exception {
        mockMvc.perform(
                        post("/api/admin/worker-team-products")
                                .with(user("admin").roles("ADMIN"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.productId").value("team-product-1"))
                .andExpect(jsonPath("$.data.members[0].role").value("leader"));

        mockMvc.perform(get("/api/admin/worker-team-products").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.content[0].productId").value("team-product-1"))
                .andExpect(jsonPath("$.data.totalElements").value(1));

        mockMvc.perform(
                        get("/api/admin/worker-team-products/missing")
                                .with(user("admin").roles("ADMIN")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").isString());
    }

    @Test
    void adminEndpointRequiresAdminAuth() throws Exception {
        mockMvc.perform(
                        post("/api/admin/worker-team-products")
                                .with(user("developer").roles("DEVELOPER"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(BODY))
                .andExpect(status().isForbidden());
    }

    @Test
    void portalEndpointsAreReadOnlyAndPublic() throws Exception {
        mockMvc.perform(get("/api/portal/worker-team-products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].pricing.plan").value("free"));

        mockMvc.perform(get("/api/portal/worker-team-products/team-product-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productId").value("team-product-1"));

        mockMvc.perform(
                        post("/api/portal/worker-team-products")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(BODY))
                .andExpect(status().is4xxClientError());
    }

    private WorkerTeamProductResult product(String productId) {
        return WorkerTeamProductResult.builder()
                .productId(productId)
                .name("Support Team")
                .version("1.0.0")
                .businessDomain("support")
                .description("Handles support")
                .status("online")
                .visibility("public")
                .pricing(objectMapper.createObjectNode().put("plan", "free"))
                .tags(List.of("support", "ai"))
                .members(
                        List.of(
                                WorkerTeamProductMemberResult.builder()
                                        .role("leader")
                                        .refName("triage-worker")
                                        .refVersion("1.0.0")
                                        .ordinal(1)
                                        .build()))
                .build();
    }

    @TestConfiguration
    @EnableMethodSecurity
    static class TestSecurityConfig {

        @Bean
        SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
            return http.csrf(AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(
                            auth ->
                                    auth.requestMatchers("/api/portal/**")
                                            .permitAll()
                                            .anyRequest()
                                            .authenticated())
                    .build();
        }
    }
}
