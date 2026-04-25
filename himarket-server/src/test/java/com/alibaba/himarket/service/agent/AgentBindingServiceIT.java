package com.alibaba.himarket.service.agent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.alibaba.himarket.dto.params.agent.CreateBindingParam;
import com.alibaba.himarket.dto.result.agent.AgentBindingResult;
import com.alibaba.himarket.dto.result.agent.AgentRoomResult;
import com.alibaba.himarket.dto.result.agent.AgentWorkspaceResult;
import com.alibaba.himarket.dto.result.common.VersionResult;
import com.alibaba.himarket.dto.result.consumer.ConsumerResult;
import com.alibaba.himarket.dto.result.product.ProductResult;
import com.alibaba.himarket.dto.result.product.SubscriptionResult;
import com.alibaba.himarket.entity.agent.AgentBindingEntity;
import com.alibaba.himarket.exception.agent.BindingForbiddenException;
import com.alibaba.himarket.support.enums.ProductType;
import com.alibaba.himarket.support.enums.SubscriptionStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;

class AgentBindingServiceIT extends AgentServiceITSupport {

    private static final String PRODUCT_ID = "skill-code-review";
    private static final String VERSION = "1.0.0";
    private static final String CONSUMER_ID = "consumer-agent-user";
    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_DISABLED = "DISABLED";

    @Autowired private AgentWorkspaceService workspaceService;
    @Autowired private AgentRoomService roomService;
    @Autowired private AgentBindingService bindingService;

    @Test
    void bindSucceedsWhenSubscriptionApproved() {
        AgentRoomResult room = createRoom();
        stubApprovedSkillBinding();

        AgentBindingResult result =
                bindingService.createBinding(USER_ID, room.getId(), bindingParam());

        assertThat(result.getRoomId()).isEqualTo(room.getId());
        assertThat(result.getKind()).isEqualTo("SKILL");
        assertThat(result.getProductId()).isEqualTo(PRODUCT_ID);
        assertThat(result.getStatus()).isEqualTo(STATUS_ACTIVE);
        assertThat(bindingRepository.findByBindingUid(result.getId())).isPresent();
    }

    @Test
    void bindWithoutSubscriptionIsForbidden() {
        AgentRoomResult room = createRoom();
        stubProductCatalog();
        stubPrimaryConsumer();
        when(consumerService.listConsumerSubscriptions(CONSUMER_ID)).thenReturn(List.of());

        assertThatThrownBy(
                        () -> bindingService.createBinding(USER_ID, room.getId(), bindingParam()))
                .isInstanceOfSatisfying(
                        BindingForbiddenException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void bindCrossTenantRoomIsForbidden() {
        AgentRoomResult room = createRoom();
        authenticate(OTHER_USER_ID);

        assertThatThrownBy(
                        () ->
                                bindingService.createBinding(
                                        OTHER_USER_ID, room.getId(), bindingParam()))
                .isInstanceOfSatisfying(
                        BindingForbiddenException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void unbindSoftDeletesBinding() {
        AgentRoomResult room = createRoom();
        stubApprovedSkillBinding();
        AgentBindingResult binding =
                bindingService.createBinding(USER_ID, room.getId(), bindingParam());

        bindingService.deleteBinding(USER_ID, binding.getId());

        AgentBindingEntity stored =
                bindingRepository.findByBindingUid(binding.getId()).orElseThrow();
        assertThat(stored.getDeletedAt()).isNotNull();
        assertThat(stored.getStatus()).isEqualTo(STATUS_DISABLED);
        assertThat(bindingService.listBindings(USER_ID, room.getId())).isEmpty();
    }

    @Test
    void listBindingsReturnsOnlyActiveRows() {
        AgentRoomResult room = createRoom();
        bindingRepository.saveAllAndFlush(
                List.of(
                        activeBinding(room.getId(), "active-product"),
                        disabledBinding(room.getId(), "disabled-product"),
                        deletedBinding(room.getId(), "deleted-product")));

        List<AgentBindingResult> bindings = bindingService.listBindings(USER_ID, room.getId());

        assertThat(bindings)
                .extracting(AgentBindingResult::getProductId)
                .containsExactly("active-product");
    }

    private AgentRoomResult createRoom() {
        AgentWorkspaceResult workspace =
                workspaceService.createWorkspace(USER_ID, createWorkspaceParam("Workspace"));
        return roomService.createRoom(USER_ID, workspace.getId(), createRoomParam("Room"));
    }

    private CreateBindingParam bindingParam() {
        CreateBindingParam param = new CreateBindingParam();
        param.setKind("SKILL");
        param.setProductId(PRODUCT_ID);
        param.setVersion(VERSION);
        return param;
    }

    private void stubApprovedSkillBinding() {
        stubProductCatalog();
        stubPrimaryConsumer();
        when(consumerService.listConsumerSubscriptions(CONSUMER_ID))
                .thenReturn(List.of(approvedSubscription()));
    }

    private void stubProductCatalog() {
        when(productService.getProducts(List.of(PRODUCT_ID)))
                .thenReturn(Map.of(PRODUCT_ID, skillProduct()));
        when(skillService.listVersions(PRODUCT_ID))
                .thenReturn(List.of(VersionResult.builder().version(VERSION).build()));
    }

    private void stubPrimaryConsumer() {
        ConsumerResult consumer = new ConsumerResult();
        consumer.setConsumerId(CONSUMER_ID);
        when(consumerService.getPrimaryConsumer(USER_ID)).thenReturn(consumer);
    }

    private ProductResult skillProduct() {
        ProductResult product = new ProductResult();
        product.setProductId(PRODUCT_ID);
        product.setType(ProductType.AGENT_SKILL);
        return product;
    }

    private SubscriptionResult approvedSubscription() {
        SubscriptionResult subscription = new SubscriptionResult();
        subscription.setProductId(PRODUCT_ID);
        subscription.setStatus(SubscriptionStatus.APPROVED.name());
        return subscription;
    }

    private AgentBindingEntity disabledBinding(String roomId, String productId) {
        AgentBindingEntity binding = activeBinding(roomId, productId);
        binding.setStatus(STATUS_DISABLED);
        return binding;
    }

    private AgentBindingEntity deletedBinding(String roomId, String productId) {
        AgentBindingEntity binding = activeBinding(roomId, productId);
        binding.setDeletedAt(LocalDateTime.now());
        return binding;
    }

    private AgentBindingEntity activeBinding(String roomId, String productId) {
        return AgentBindingEntity.builder()
                .bindingUid("binding-" + productId)
                .roomUid(roomId)
                .kind("SKILL")
                .productId(productId)
                .version(VERSION)
                .status(STATUS_ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();
    }
}
