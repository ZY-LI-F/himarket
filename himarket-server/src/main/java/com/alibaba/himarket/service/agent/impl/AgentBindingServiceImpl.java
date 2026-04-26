package com.alibaba.himarket.service.agent.impl;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.core.utils.IdGenerator;
import com.alibaba.himarket.dto.converter.agent.AgentBindingConverter;
import com.alibaba.himarket.dto.params.agent.CreateBindingParam;
import com.alibaba.himarket.dto.result.agent.AgentBindingResult;
import com.alibaba.himarket.dto.result.common.VersionResult;
import com.alibaba.himarket.dto.result.consumer.ConsumerResult;
import com.alibaba.himarket.dto.result.product.ProductResult;
import com.alibaba.himarket.dto.result.product.SubscriptionResult;
import com.alibaba.himarket.entity.agent.AgentBindingEntity;
import com.alibaba.himarket.exception.agent.BindingForbiddenException;
import com.alibaba.himarket.repository.agent.AgentBindingRepository;
import com.alibaba.himarket.repository.agent.AgentRoomRepository;
import com.alibaba.himarket.service.ConsumerService;
import com.alibaba.himarket.service.McpServerService;
import com.alibaba.himarket.service.ProductService;
import com.alibaba.himarket.service.SkillService;
import com.alibaba.himarket.service.agent.AgentBindingService;
import com.alibaba.himarket.service.agent.AgentNacosSyncService;
import com.alibaba.himarket.support.enums.ProductType;
import com.alibaba.himarket.support.enums.SubscriptionStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AgentBindingServiceImpl implements AgentBindingService {

    private static final String BINDING_PREFIX = "binding-";
    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_DISABLED = "DISABLED";
    private static final String KIND_SKILL = "SKILL";
    private static final String KIND_MCP = "MCP";
    private static final String KIND_MODEL = "MODEL";
    private static final String AUTH_MISMATCH_MESSAGE =
            "userId conflicts with authenticated principal";

    private final AgentBindingRepository bindingRepository;
    private final AgentRoomRepository roomRepository;
    private final AgentBindingConverter bindingConverter;
    private final ProductService productService;
    private final SkillService skillService;
    private final McpServerService mcpServerService;
    private final ConsumerService consumerService;
    private final AgentNacosSyncService nacosSyncService;

    @Override
    @Transactional(readOnly = true)
    public List<AgentBindingResult> listBindings(String userId, String roomId) {
        findRoomForTenant(roomId, resolveTenantId(userId));
        return bindingRepository
                .findByRoomUidAndStatusAndDeletedAtIsNullOrderByCreatedAtAsc(roomId, STATUS_ACTIVE)
                .stream()
                .map(bindingConverter::toResult)
                .toList();
    }

    @Override
    public AgentBindingResult createBinding(
            String userId, String roomId, CreateBindingParam param) {
        findRoomForTenant(roomId, resolveTenantId(userId));
        ProductResult product = findProduct(param.getKind(), param.getProductId());
        verifyCatalogEntry(product, param.getKind(), param.getVersion());
        verifyApprovedSubscription(userId, param.getProductId());

        AgentBindingEntity binding =
                AgentBindingEntity.builder()
                        .bindingUid(IdGenerator.genIdWithPrefix(BINDING_PREFIX))
                        .roomUid(roomId)
                        .kind(param.getKind())
                        .productId(param.getProductId())
                        .version(param.getVersion())
                        .status(STATUS_ACTIVE)
                        .createdAt(LocalDateTime.now())
                        .build();
        AgentBindingEntity saved = bindingRepository.save(binding);
        nacosSyncService.publishSkillBinding(roomId);
        return bindingConverter.toResult(saved);
    }

    @Override
    public void deleteBinding(String userId, String bindingId) {
        String tenantId = resolveTenantId(userId);
        AgentBindingEntity binding =
                bindingRepository
                        .findByBindingUidAndDeletedAtIsNull(bindingId)
                        .orElseThrow(() -> forbidden("binding is not accessible"));
        findRoomForTenant(binding.getRoomUid(), tenantId);
        binding.setStatus(STATUS_DISABLED);
        binding.setDeletedAt(LocalDateTime.now());
        bindingRepository.saveAndFlush(binding);
        nacosSyncService.publishSkillBinding(binding.getRoomUid());
    }

    private void findRoomForTenant(String roomId, String tenantId) {
        roomRepository
                .findByRoomUidAndTenantIdAndDeletedAtIsNull(roomId, tenantId)
                .orElseThrow(() -> forbidden("room is not accessible"));
    }

    private ProductResult findProduct(String kind, String productId) {
        Map<String, ProductResult> products = productService.getProducts(List.of(productId));
        ProductResult product = products.get(productId);
        if (product == null || product.getType() != expectedProductType(kind)) {
            throw forbidden("product is not available for this binding kind");
        }
        return product;
    }

    private ProductType expectedProductType(String kind) {
        return switch (kind) {
            case KIND_SKILL -> ProductType.AGENT_SKILL;
            case KIND_MCP -> ProductType.MCP_SERVER;
            case KIND_MODEL -> ProductType.MODEL_API;
            default -> throw forbidden("unsupported binding kind");
        };
    }

    private void verifyCatalogEntry(ProductResult product, String kind, String version) {
        if (KIND_SKILL.equals(kind)) {
            verifySkillVersion(product.getProductId(), version);
            return;
        }
        if (KIND_MCP.equals(kind)) {
            verifyMcpCatalog(product.getProductId());
        }
    }

    private void verifySkillVersion(String productId, String version) {
        boolean exists =
                skillService.listVersions(productId).stream()
                        .map(VersionResult::getVersion)
                        .anyMatch(version::equals);
        if (!exists) {
            throw forbidden("product version is not available");
        }
    }

    private void verifyMcpCatalog(String productId) {
        if (mcpServerService.listMetaByProduct(productId).isEmpty()) {
            throw forbidden("mcp product is not available");
        }
    }

    private void verifyApprovedSubscription(String userId, String productId) {
        String consumerId = primaryConsumerId(userId);
        boolean approved =
                consumerService.listConsumerSubscriptions(consumerId).stream()
                        .filter(subscription -> productId.equals(subscription.getProductId()))
                        .map(SubscriptionResult::getStatus)
                        .anyMatch(SubscriptionStatus.APPROVED.name()::equals);
        if (!approved) {
            throw forbidden("approved subscription is required");
        }
    }

    private String primaryConsumerId(String userId) {
        try {
            ConsumerResult consumer = consumerService.getPrimaryConsumer(userId);
            return consumer.getConsumerId();
        } catch (BusinessException e) {
            throw forbidden("approved subscription is required");
        }
    }

    private String resolveTenantId(String userId) {
        String currentUserId = currentUserId();
        if (!currentUserId.equals(userId)) {
            throw new BusinessException(ErrorCode.CONFLICT, AUTH_MISMATCH_MESSAGE);
        }
        return currentUserId;
    }

    private String currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "用户未认证");
        }
        return authentication.getName();
    }

    private BindingForbiddenException forbidden(String message) {
        return new BindingForbiddenException(message);
    }
}
