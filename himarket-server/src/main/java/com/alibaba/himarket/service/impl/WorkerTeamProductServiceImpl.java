package com.alibaba.himarket.service.impl;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.core.utils.IdGenerator;
import com.alibaba.himarket.dto.params.consumer.CreateSubscriptionParam;
import com.alibaba.himarket.dto.params.worker.UpsertWorkerTeamProductParam;
import com.alibaba.himarket.dto.params.worker.WorkerTeamProductMemberParam;
import com.alibaba.himarket.dto.result.common.PageResult;
import com.alibaba.himarket.dto.result.consumer.ConsumerResult;
import com.alibaba.himarket.dto.result.product.SubscriptionResult;
import com.alibaba.himarket.dto.result.worker.WorkerTeamProductMemberResult;
import com.alibaba.himarket.dto.result.worker.WorkerTeamProductResult;
import com.alibaba.himarket.entity.ProductSubscription;
import com.alibaba.himarket.entity.WorkerTeamProductEntity;
import com.alibaba.himarket.entity.WorkerTeamProductMemberEntity;
import com.alibaba.himarket.repository.SubscriptionRepository;
import com.alibaba.himarket.repository.WorkerTeamProductRepository;
import com.alibaba.himarket.service.ConsumerService;
import com.alibaba.himarket.service.WorkerTeamProductService;
import com.alibaba.himarket.support.enums.SubscriptionStatus;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkerTeamProductServiceImpl implements WorkerTeamProductService {

    private static final String RESOURCE = "WorkerTeamProduct";

    private final WorkerTeamProductRepository repository;

    private final ObjectMapper objectMapper;

    private final ConsumerService consumerService;

    private final SubscriptionRepository subscriptionRepository;

    @Override
    @Transactional
    public WorkerTeamProductResult upsertWorkerTeamProduct(UpsertWorkerTeamProductParam param) {
        WorkerTeamProductEntity entity =
                repository.findById(param.getProductId()).orElseGet(WorkerTeamProductEntity::new);
        entity.setProductId(param.getProductId());
        entity.setName(param.getName());
        entity.setVersion(param.getVersion());
        entity.setBusinessDomain(param.getBusinessDomain());
        entity.setDescription(param.getDescription());
        entity.setStatus(param.getStatus());
        entity.setVisibility(param.getVisibility());
        entity.setPricing(toJson(param.getPricing()));
        entity.setTagsJson(toJson(param.getTags()));
        syncMembers(entity, param.getMembers());

        return toResult(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<WorkerTeamProductResult> listWorkerTeamProducts(Pageable pageable) {
        Page<WorkerTeamProductEntity> page = repository.findAll(pageable);
        return new PageResult<WorkerTeamProductResult>().convertFrom(page, this::toResult);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkerTeamProductResult getWorkerTeamProduct(String productId) {
        return repository
                .findById(productId)
                .map(this::toResult)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, RESOURCE, productId));
    }

    @Override
    @Transactional
    public SubscriptionResult subscribeWorkerTeamProduct(CreateSubscriptionParam param) {
        WorkerTeamProductEntity team =
                repository
                        .findById(param.getProductId())
                        .orElseThrow(
                                () ->
                                        new BusinessException(
                                                ErrorCode.NOT_FOUND,
                                                RESOURCE,
                                                param.getProductId()));

        ConsumerResult primaryConsumer = consumerService.getPrimaryConsumer();
        String consumerId = primaryConsumer.getConsumerId();
        if (subscriptionRepository
                .findByConsumerIdAndProductId(consumerId, team.getProductId())
                .isPresent()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Duplicate subscription");
        }

        ProductSubscription subscription =
                ProductSubscription.builder()
                        .subscriptionId(IdGenerator.genSubscriptionId())
                        .productId(team.getProductId())
                        .consumerId(consumerId)
                        .status(SubscriptionStatus.APPROVED)
                        .build();

        ProductSubscription saved = subscriptionRepository.save(subscription);
        SubscriptionResult result = new SubscriptionResult().convertFrom(saved);
        result.setProductName(team.getName());
        return result;
    }

    private void syncMembers(
            WorkerTeamProductEntity entity, List<WorkerTeamProductMemberParam> params) {
        if (params == null) {
            entity.getMembers().clear();
            return;
        }

        Set<Integer> ordinals = new HashSet<>();
        Map<Integer, WorkerTeamProductMemberEntity> existingMembers =
                entity.getMembers().stream()
                        .collect(
                                Collectors.toMap(
                                        WorkerTeamProductMemberEntity::getOrdinal, m -> m));

        for (WorkerTeamProductMemberParam param : params) {
            if (!ordinals.add(param.getOrdinal())) {
                throw new BusinessException(
                        ErrorCode.INVALID_PARAMETER,
                        "duplicate member ordinal " + param.getOrdinal());
            }
            WorkerTeamProductMemberEntity member = existingMembers.get(param.getOrdinal());
            if (member == null) {
                member =
                        WorkerTeamProductMemberEntity.builder()
                                .productId(entity.getProductId())
                                .ordinal(param.getOrdinal())
                                .build();
                entity.addMember(member);
            }
            member.setRole(param.getRole());
            member.setRefName(param.getRefName());
            member.setRefVersion(param.getRefVersion());
        }
        entity.getMembers().removeIf(member -> !ordinals.contains(member.getOrdinal()));
        entity.getMembers().sort(Comparator.comparing(WorkerTeamProductMemberEntity::getOrdinal));
    }

    private WorkerTeamProductResult toResult(WorkerTeamProductEntity entity) {
        return WorkerTeamProductResult.builder()
                .productId(entity.getProductId())
                .name(entity.getName())
                .version(entity.getVersion())
                .businessDomain(entity.getBusinessDomain())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .visibility(entity.getVisibility())
                .pricing(toJsonNode(entity.getPricing(), entity.getProductId()))
                .tags(toStringList(entity.getTagsJson(), entity.getProductId()))
                .members(toMemberResults(entity.getMembers()))
                .createAt(entity.getCreateAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private List<WorkerTeamProductMemberResult> toMemberResults(
            List<WorkerTeamProductMemberEntity> members) {
        if (members == null) {
            return List.of();
        }
        return members.stream()
                .map(
                        member ->
                                WorkerTeamProductMemberResult.builder()
                                        .role(member.getRole())
                                        .refName(member.getRefName())
                                        .refVersion(member.getRefVersion())
                                        .ordinal(member.getOrdinal())
                                        .build())
                .collect(Collectors.toList());
    }

    private String toJson(JsonNode jsonNode) {
        if (jsonNode == null || jsonNode.isNull()) {
            return null;
        }
        return jsonNode.toString();
    }

    private String toJson(List<String> values) {
        if (values == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize worker team product tags", e);
        }
    }

    private JsonNode toJsonNode(String value, String productId) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            JsonNode node = objectMapper.readTree(value);
            if (node.isTextual()) {
                return objectMapper.readTree(node.asText());
            }
            return node;
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(
                    "Invalid pricing JSON for worker team product " + productId, e);
        }
    }

    private List<String> toStringList(String value, String productId) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        try {
            JsonNode node = objectMapper.readTree(value);
            if (node.isTextual()) {
                node = objectMapper.readTree(node.asText());
            }
            return objectMapper.convertValue(node, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(
                    "Invalid tags JSON for worker team product " + productId, e);
        }
    }
}
