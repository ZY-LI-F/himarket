package com.alibaba.himarket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.dto.params.worker.UpsertWorkerTeamProductParam;
import com.alibaba.himarket.dto.params.worker.WorkerTeamProductMemberParam;
import com.alibaba.himarket.dto.result.common.PageResult;
import com.alibaba.himarket.dto.result.worker.WorkerTeamProductResult;
import com.alibaba.himarket.entity.WorkerTeamProductEntity;
import com.alibaba.himarket.entity.WorkerTeamProductMemberEntity;
import com.alibaba.himarket.repository.WorkerTeamProductRepository;
import com.alibaba.himarket.service.impl.WorkerTeamProductServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class WorkerTeamProductServiceTest {

    @Mock private WorkerTeamProductRepository repository;

    private WorkerTeamProductService service;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        service = new WorkerTeamProductServiceImpl(repository, objectMapper);
    }

    @Test
    void upsertWorkerTeamProductInsertsWhenMissing() {
        UpsertWorkerTeamProductParam param = upsertParam("team-product-1", "Support Team");
        when(repository.findById("team-product-1")).thenReturn(Optional.empty());
        when(repository.saveAndFlush(any(WorkerTeamProductEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        WorkerTeamProductResult result = service.upsertWorkerTeamProduct(param);

        ArgumentCaptor<WorkerTeamProductEntity> captor =
                ArgumentCaptor.forClass(WorkerTeamProductEntity.class);
        verify(repository).saveAndFlush(captor.capture());
        WorkerTeamProductEntity saved = captor.getValue();
        assertThat(saved.getProductId()).isEqualTo("team-product-1");
        assertThat(saved.getPricing()).isEqualTo("{\"plan\":\"free\"}");
        assertThat(saved.getTagsJson()).isEqualTo("[\"support\",\"ai\"]");
        assertThat(saved.getMembers())
                .extracting(WorkerTeamProductMemberEntity::getOrdinal)
                .containsExactly(1, 2);
        assertThat(result.getProductId()).isEqualTo("team-product-1");
        assertThat(result.getPricing().get("plan").asText()).isEqualTo("free");
        assertThat(result.getTags()).containsExactly("support", "ai");
    }

    @Test
    void upsertWorkerTeamProductUpdatesWhenExisting() {
        WorkerTeamProductEntity existing = existingEntity("team-product-1", "Old Team");
        when(repository.findById("team-product-1")).thenReturn(Optional.of(existing));
        when(repository.saveAndFlush(any(WorkerTeamProductEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        WorkerTeamProductResult result =
                service.upsertWorkerTeamProduct(upsertParam("team-product-1", "Updated Team"));

        assertThat(existing.getName()).isEqualTo("Updated Team");
        assertThat(existing.getMembers()).hasSize(2);
        assertThat(result.getName()).isEqualTo("Updated Team");
        assertThat(result.getMembers())
                .extracting("refName")
                .containsExactly("triage-worker", "answer-worker");
        verify(repository).saveAndFlush(existing);
    }

    @Test
    void listWorkerTeamProductsReturnsPageResult() {
        PageRequest pageable = PageRequest.of(0, 20);
        when(repository.findAll(pageable))
                .thenReturn(
                        new PageImpl<>(
                                List.of(existingEntity("team-product-1", "Team")), pageable, 1));

        PageResult<WorkerTeamProductResult> result = service.listWorkerTeamProducts(pageable);

        assertThat(result.getNumber()).isEqualTo(1);
        assertThat(result.getSize()).isEqualTo(20);
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getProductId()).isEqualTo("team-product-1");
    }

    @Test
    void getWorkerTeamProductThrowsNotFoundWhenMissing() {
        when(repository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getWorkerTeamProduct("missing"))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ErrorCode.NOT_FOUND.name());
    }

    private UpsertWorkerTeamProductParam upsertParam(String productId, String name) {
        UpsertWorkerTeamProductParam param = new UpsertWorkerTeamProductParam();
        param.setProductId(productId);
        param.setName(name);
        param.setVersion("1.0.0");
        param.setBusinessDomain("support");
        param.setDescription("Handles customer support workflows");
        param.setStatus("online");
        param.setVisibility("public");
        param.setPricing(objectMapper.createObjectNode().put("plan", "free"));
        param.setTags(List.of("support", "ai"));
        param.setMembers(
                List.of(
                        member("leader", "triage-worker", "1.0.0", 1),
                        member("member", "answer-worker", "1.0.0", 2)));
        return param;
    }

    private WorkerTeamProductMemberParam member(
            String role, String refName, String refVersion, int ordinal) {
        WorkerTeamProductMemberParam param = new WorkerTeamProductMemberParam();
        param.setRole(role);
        param.setRefName(refName);
        param.setRefVersion(refVersion);
        param.setOrdinal(ordinal);
        return param;
    }

    private WorkerTeamProductEntity existingEntity(String productId, String name) {
        WorkerTeamProductEntity entity =
                WorkerTeamProductEntity.builder()
                        .productId(productId)
                        .name(name)
                        .version("1.0.0")
                        .businessDomain("support")
                        .description("Existing")
                        .status("online")
                        .visibility("public")
                        .pricing("{\"plan\":\"free\"}")
                        .tagsJson("[\"support\",\"ai\"]")
                        .build();
        entity.replaceMembers(
                List.of(
                        WorkerTeamProductMemberEntity.builder()
                                .productId(productId)
                                .ordinal(1)
                                .role("leader")
                                .refName("triage-worker")
                                .refVersion("1.0.0")
                                .build()));
        return entity;
    }
}
