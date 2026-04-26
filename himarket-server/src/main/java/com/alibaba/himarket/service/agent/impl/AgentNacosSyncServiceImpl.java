package com.alibaba.himarket.service.agent.impl;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.entity.agent.AgentBindingEntity;
import com.alibaba.himarket.entity.agent.AgentRoomConfigEntity;
import com.alibaba.himarket.entity.agent.AgentRoomEntity;
import com.alibaba.himarket.entity.agent.AgentTeamTemplateEntity;
import com.alibaba.himarket.entity.agent.AgentWorkspaceEntity;
import com.alibaba.himarket.repository.agent.AgentBindingRepository;
import com.alibaba.himarket.repository.agent.AgentRoomConfigRepository;
import com.alibaba.himarket.repository.agent.AgentRoomRepository;
import com.alibaba.himarket.repository.agent.AgentTeamTemplateRepository;
import com.alibaba.himarket.repository.agent.AgentWorkspaceRepository;
import com.alibaba.himarket.service.agent.AgentNacosConfigClient;
import com.alibaba.himarket.service.agent.AgentNacosSyncService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.function.Supplier;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
@ConditionalOnBean(AgentNacosConfigClient.class)
public class AgentNacosSyncServiceImpl implements AgentNacosSyncService {

    private static final int SCHEMA_VERSION = 1;
    private static final String RESOURCE_NACOS_DATA_ID = "AgentNacosDataId";
    private static final String RESOURCE_WORKSPACE = "AgentWorkspace";
    private static final String STATUS_ACTIVE = "ACTIVE";

    private final AgentWorkspaceRepository workspaceRepository;
    private final AgentRoomRepository roomRepository;
    private final AgentRoomConfigRepository roomConfigRepository;
    private final AgentTeamTemplateRepository teamTemplateRepository;
    private final AgentBindingRepository bindingRepository;
    private final AgentNacosConfigClient nacosConfigClient;
    private final ObjectMapper objectMapper;

    @Override
    public void publishWorkspaceList() {
        publishAfterCommit(WORKSPACE_LIST_DATA_ID, this::workspaceListJson);
    }

    @Override
    public void publishRoomConfig(String roomId) {
        publishAfterCommit(
                AgentNacosSyncService.roomConfigDataId(roomId), () -> roomConfigJson(roomId));
    }

    @Override
    public void publishTeamTemplateList() {
        publishAfterCommit(TEAM_TEMPLATE_LIST_DATA_ID, this::teamTemplateListJson);
    }

    @Override
    public void publishSkillBinding(String roomId) {
        publishAfterCommit(
                AgentNacosSyncService.skillBindingDataId(roomId), () -> skillBindingJson(roomId));
    }

    @Override
    public void restoreWorkspace(String userId, String workspaceId) {
        WorkspaceListSnapshot workspaceList =
                readDataId(WORKSPACE_LIST_DATA_ID, WorkspaceListSnapshot.class);
        WorkspaceSnapshot workspace =
                safeList(workspaceList.getWorkspaces()).stream()
                        .filter(candidate -> workspaceId.equals(candidate.getId()))
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        new BusinessException(
                                                ErrorCode.NOT_FOUND,
                                                RESOURCE_WORKSPACE,
                                                workspaceId));
        requireSameUser(userId, workspace);

        restoreTeamTemplates(
                readDataId(TEAM_TEMPLATE_LIST_DATA_ID, TeamTemplateListSnapshot.class));
        restoreWorkspaceRow(userId, workspace);
        restoreRooms(workspace);
    }

    private void publishAfterCommit(String dataId, Supplier<String> contentSupplier) {
        Runnable task = () -> publishNow(dataId, contentSupplier);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            task.run();
                        }
                    });
            return;
        }
        task.run();
    }

    private void publishNow(String dataId, Supplier<String> contentSupplier) {
        try {
            nacosConfigClient.publish(dataId, contentSupplier.get());
        } catch (RuntimeException e) {
            // Nacos is a secondary snapshot sink. A Nacos outage must not roll back the already
            // committed CRUD path, so failures are logged and retried asynchronously.
            log.warn("Failed to publish Nacos dataId {}, scheduling async retry", dataId, e);
            retryAsync(dataId, contentSupplier);
        }
    }

    private void retryAsync(String dataId, Supplier<String> contentSupplier) {
        CompletableFuture.runAsync(
                () -> {
                    try {
                        nacosConfigClient.publish(dataId, contentSupplier.get());
                    } catch (RuntimeException retryError) {
                        log.error("Async retry failed for Nacos dataId {}", dataId, retryError);
                    }
                });
    }

    private String workspaceListJson() {
        List<AgentRoomEntity> rooms = roomRepository.findAll();
        List<WorkspaceSnapshot> workspaces =
                workspaceRepository.findAll().stream()
                        .filter(workspace -> workspace.getDeletedAt() == null)
                        .sorted(Comparator.comparing(AgentWorkspaceEntity::getCreatedAt))
                        .map(workspace -> toWorkspaceSnapshot(workspace, rooms))
                        .toList();
        return writeJson(
                WorkspaceListSnapshot.builder()
                        .schemaVersion(SCHEMA_VERSION)
                        .workspaces(workspaces)
                        .build());
    }

    private WorkspaceSnapshot toWorkspaceSnapshot(
            AgentWorkspaceEntity workspace, List<AgentRoomEntity> rooms) {
        List<String> roomIds =
                rooms.stream()
                        .filter(room -> workspace.getWorkspaceUid().equals(room.getWorkspaceUid()))
                        .filter(room -> workspace.getTenantId().equals(room.getTenantId()))
                        .filter(room -> room.getDeletedAt() == null)
                        .sorted(Comparator.comparing(AgentRoomEntity::getCreatedAt))
                        .map(AgentRoomEntity::getRoomUid)
                        .toList();
        return WorkspaceSnapshot.builder()
                .id(workspace.getWorkspaceUid())
                .tenantId(workspace.getTenantId())
                .ownerId(workspace.getOwnerId())
                .name(workspace.getName())
                .description(workspace.getDescription())
                .defaultTeamTemplateId(workspace.getDefaultTeamTemplateId())
                .active(workspace.getActive())
                .createdAt(workspace.getCreatedAt())
                .updatedAt(workspace.getUpdatedAt())
                .roomIds(roomIds)
                .build();
    }

    private String roomConfigJson(String roomId) {
        AgentRoomEntity room = findRoomAnyState(roomId);
        AgentRoomConfigEntity config =
                roomConfigRepository
                        .findByRoomUid(roomId)
                        .orElseThrow(
                                () ->
                                        new BusinessException(
                                                ErrorCode.NOT_FOUND, "AgentRoomConfig", roomId));
        RoomConfigSnapshot snapshot =
                RoomConfigSnapshot.builder()
                        .schemaVersion(SCHEMA_VERSION)
                        .room(toRoomSnapshot(room))
                        .config(toConfigSnapshot(config))
                        .build();
        return writeJson(snapshot);
    }

    private RoomSnapshot toRoomSnapshot(AgentRoomEntity room) {
        return RoomSnapshot.builder()
                .id(room.getRoomUid())
                .workspaceId(room.getWorkspaceUid())
                .tenantId(room.getTenantId())
                .name(room.getName())
                .modelId(room.getModelId())
                .teamTemplateId(room.getTeamTemplateId())
                .fileRoot(room.getFileRoot())
                .permissionJson(room.getPermissionJson())
                .createdAt(room.getCreatedAt())
                .updatedAt(room.getUpdatedAt())
                .deletedAt(room.getDeletedAt())
                .build();
    }

    private RoomConfigRowSnapshot toConfigSnapshot(AgentRoomConfigEntity config) {
        return RoomConfigRowSnapshot.builder()
                .roomId(config.getRoomUid())
                .configJson(config.getConfigJson())
                .version(config.getVersion())
                .updatedAt(config.getUpdatedAt())
                .build();
    }

    private String teamTemplateListJson() {
        List<TeamTemplateSnapshot> templates =
                teamTemplateRepository.findAll().stream()
                        .sorted(Comparator.comparing(AgentTeamTemplateEntity::getCreatedAt))
                        .map(this::toTeamTemplateSnapshot)
                        .toList();
        return writeJson(
                TeamTemplateListSnapshot.builder()
                        .schemaVersion(SCHEMA_VERSION)
                        .templates(templates)
                        .build());
    }

    private TeamTemplateSnapshot toTeamTemplateSnapshot(AgentTeamTemplateEntity template) {
        return TeamTemplateSnapshot.builder()
                .id(template.getTemplateId())
                .name(template.getName())
                .version(template.getVersion())
                .managerProfileJson(template.getManagerProfileJson())
                .workersProfileJson(template.getWorkersProfileJson())
                .defaultSkills(template.getDefaultSkills())
                .defaultMcps(template.getDefaultMcps())
                .createdAt(template.getCreatedAt())
                .build();
    }

    private String skillBindingJson(String roomId) {
        List<BindingSnapshot> bindings =
                bindingRepository.findAll().stream()
                        .filter(binding -> roomId.equals(binding.getRoomUid()))
                        .filter(binding -> binding.getDeletedAt() == null)
                        .filter(binding -> STATUS_ACTIVE.equals(binding.getStatus()))
                        .sorted(Comparator.comparing(AgentBindingEntity::getCreatedAt))
                        .map(this::toBindingSnapshot)
                        .toList();
        return writeJson(
                SkillBindingSnapshot.builder()
                        .schemaVersion(SCHEMA_VERSION)
                        .roomId(roomId)
                        .bindings(bindings)
                        .build());
    }

    private BindingSnapshot toBindingSnapshot(AgentBindingEntity binding) {
        return BindingSnapshot.builder()
                .id(binding.getBindingUid())
                .roomId(binding.getRoomUid())
                .kind(binding.getKind())
                .productId(binding.getProductId())
                .version(binding.getVersion())
                .status(binding.getStatus())
                .createdAt(binding.getCreatedAt())
                .deletedAt(binding.getDeletedAt())
                .build();
    }

    private void restoreTeamTemplates(TeamTemplateListSnapshot snapshot) {
        teamTemplateRepository.deleteAllInBatch();
        List<AgentTeamTemplateEntity> templates =
                safeList(snapshot.getTemplates()).stream().map(this::toTeamTemplateEntity).toList();
        teamTemplateRepository.saveAllAndFlush(templates);
    }

    private AgentTeamTemplateEntity toTeamTemplateEntity(TeamTemplateSnapshot snapshot) {
        return AgentTeamTemplateEntity.builder()
                .templateId(snapshot.getId())
                .name(snapshot.getName())
                .version(snapshot.getVersion())
                .managerProfileJson(snapshot.getManagerProfileJson())
                .workersProfileJson(snapshot.getWorkersProfileJson())
                .defaultSkills(snapshot.getDefaultSkills())
                .defaultMcps(snapshot.getDefaultMcps())
                .createdAt(snapshot.getCreatedAt())
                .build();
    }

    private void restoreWorkspaceRow(String userId, WorkspaceSnapshot snapshot) {
        workspaceRepository
                .findByWorkspaceUid(snapshot.getId())
                .ifPresent(
                        existing -> {
                            if (!userId.equals(existing.getTenantId())) {
                                throw new BusinessException(
                                        ErrorCode.CONFLICT,
                                        "workspaceId belongs to another tenant");
                            }
                        });
        AgentWorkspaceEntity workspace =
                workspaceRepository
                        .findByWorkspaceUid(snapshot.getId())
                        .orElseGet(AgentWorkspaceEntity::new);
        workspace.setWorkspaceUid(snapshot.getId());
        workspace.setTenantId(snapshot.getTenantId());
        workspace.setOwnerId(snapshot.getOwnerId());
        workspace.setName(snapshot.getName());
        workspace.setDescription(snapshot.getDescription());
        workspace.setDefaultTeamTemplateId(snapshot.getDefaultTeamTemplateId());
        workspace.setActive(snapshot.getActive());
        workspace.setCreatedAt(snapshot.getCreatedAt());
        workspace.setUpdatedAt(snapshot.getUpdatedAt());
        workspace.setDeletedAt(null);
        workspaceRepository.saveAndFlush(workspace);
    }

    private void restoreRooms(WorkspaceSnapshot workspace) {
        removeExistingWorkspaceRooms(workspace);
        for (String roomId : safeList(workspace.getRoomIds())) {
            RoomConfigSnapshot roomSnapshot =
                    readDataId(
                            AgentNacosSyncService.roomConfigDataId(roomId),
                            RoomConfigSnapshot.class);
            requireMatchingWorkspace(workspace, roomSnapshot.getRoom());
            requireMatchingConfig(roomId, roomSnapshot.getConfig());
            roomRepository.save(toRoomEntity(roomSnapshot.getRoom()));
            roomConfigRepository.save(toRoomConfigEntity(roomSnapshot.getConfig()));
            restoreBindings(roomId);
        }
        roomConfigRepository.flush();
        roomRepository.flush();
        bindingRepository.flush();
    }

    private void removeExistingWorkspaceRooms(WorkspaceSnapshot workspace) {
        List<AgentRoomEntity> existingRooms =
                roomRepository.findAll().stream()
                        .filter(room -> workspace.getId().equals(room.getWorkspaceUid()))
                        .filter(room -> workspace.getTenantId().equals(room.getTenantId()))
                        .toList();
        Set<String> existingRoomIds =
                existingRooms.stream()
                        .map(AgentRoomEntity::getRoomUid)
                        .collect(java.util.stream.Collectors.toSet());
        List<AgentBindingEntity> bindings =
                bindingRepository.findAll().stream()
                        .filter(binding -> existingRoomIds.contains(binding.getRoomUid()))
                        .toList();
        List<AgentRoomConfigEntity> configs =
                roomConfigRepository.findAll().stream()
                        .filter(config -> existingRoomIds.contains(config.getRoomUid()))
                        .toList();
        bindingRepository.deleteAllInBatch(bindings);
        roomConfigRepository.deleteAllInBatch(configs);
        roomRepository.deleteAllInBatch(existingRooms);
    }

    private AgentRoomEntity toRoomEntity(RoomSnapshot snapshot) {
        return AgentRoomEntity.builder()
                .roomUid(snapshot.getId())
                .workspaceUid(snapshot.getWorkspaceId())
                .tenantId(snapshot.getTenantId())
                .name(snapshot.getName())
                .modelId(snapshot.getModelId())
                .teamTemplateId(snapshot.getTeamTemplateId())
                .fileRoot(snapshot.getFileRoot())
                .permissionJson(snapshot.getPermissionJson())
                .createdAt(snapshot.getCreatedAt())
                .updatedAt(snapshot.getUpdatedAt())
                .deletedAt(null)
                .build();
    }

    private AgentRoomConfigEntity toRoomConfigEntity(RoomConfigRowSnapshot snapshot) {
        return AgentRoomConfigEntity.builder()
                .roomUid(snapshot.getRoomId())
                .configJson(snapshot.getConfigJson())
                .version(snapshot.getVersion())
                .updatedAt(snapshot.getUpdatedAt())
                .build();
    }

    private void restoreBindings(String roomId) {
        SkillBindingSnapshot snapshot =
                readDataId(
                        AgentNacosSyncService.skillBindingDataId(roomId),
                        SkillBindingSnapshot.class);
        if (!roomId.equals(snapshot.getRoomId())) {
            throw new BusinessException(ErrorCode.CONFLICT, "skill binding roomId mismatch");
        }
        List<AgentBindingEntity> bindings =
                safeList(snapshot.getBindings()).stream()
                        .map(binding -> toBindingEntity(roomId, binding))
                        .toList();
        bindingRepository.saveAll(bindings);
    }

    private AgentBindingEntity toBindingEntity(String roomId, BindingSnapshot snapshot) {
        requireMatchingBinding(roomId, snapshot);
        return toBindingEntity(snapshot);
    }

    private AgentBindingEntity toBindingEntity(BindingSnapshot snapshot) {
        return AgentBindingEntity.builder()
                .bindingUid(snapshot.getId())
                .roomUid(snapshot.getRoomId())
                .kind(snapshot.getKind())
                .productId(snapshot.getProductId())
                .version(snapshot.getVersion())
                .status(snapshot.getStatus())
                .createdAt(snapshot.getCreatedAt())
                .deletedAt(null)
                .build();
    }

    private void requireSameUser(String userId, WorkspaceSnapshot workspace) {
        if (!userId.equals(workspace.getTenantId()) || !userId.equals(workspace.getOwnerId())) {
            throw new BusinessException(ErrorCode.CONFLICT, "workspace snapshot user mismatch");
        }
    }

    private void requireMatchingWorkspace(WorkspaceSnapshot workspace, RoomSnapshot room) {
        if (room == null
                || !workspace.getId().equals(room.getWorkspaceId())
                || !workspace.getTenantId().equals(room.getTenantId())
                || room.getDeletedAt() != null) {
            throw new BusinessException(ErrorCode.CONFLICT, "room snapshot workspace mismatch");
        }
    }

    private void requireMatchingConfig(String roomId, RoomConfigRowSnapshot config) {
        if (config == null || !roomId.equals(config.getRoomId())) {
            throw new BusinessException(ErrorCode.CONFLICT, "room config snapshot roomId mismatch");
        }
    }

    private void requireMatchingBinding(String roomId, BindingSnapshot binding) {
        if (binding == null || !roomId.equals(binding.getRoomId())) {
            throw new BusinessException(ErrorCode.CONFLICT, "binding snapshot roomId mismatch");
        }
    }

    private AgentRoomEntity findRoomAnyState(String roomId) {
        return roomRepository
                .findByRoomUid(roomId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "AgentRoom", roomId));
    }

    private <T> T readDataId(String dataId, Class<T> type) {
        String content = nacosConfigClient.get(dataId);
        if (!StringUtils.hasText(content)) {
            throw new BusinessException(ErrorCode.NOT_FOUND, RESOURCE_NACOS_DATA_ID, dataId);
        }
        try {
            return objectMapper.readValue(content, type);
        } catch (JsonProcessingException e) {
            throw new BusinessException(
                    ErrorCode.INTERNAL_ERROR, e, "Invalid Nacos snapshot: " + dataId);
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, e, "Agent Nacos snapshot JSON");
        }
    }

    private <T> List<T> safeList(List<T> values) {
        return values == null ? List.of() : values;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    static class WorkspaceListSnapshot {
        private int schemaVersion;
        private List<WorkspaceSnapshot> workspaces;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    static class WorkspaceSnapshot {
        private String id;
        private String tenantId;
        private String ownerId;
        private String name;
        private String description;
        private String defaultTeamTemplateId;
        private Boolean active;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private List<String> roomIds;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    static class RoomConfigSnapshot {
        private int schemaVersion;
        private RoomSnapshot room;
        private RoomConfigRowSnapshot config;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    static class RoomSnapshot {
        private String id;
        private String workspaceId;
        private String tenantId;
        private String name;
        private String modelId;
        private String teamTemplateId;
        private String fileRoot;
        private String permissionJson;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime deletedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    static class RoomConfigRowSnapshot {
        private String roomId;
        private String configJson;
        private Long version;
        private LocalDateTime updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    static class TeamTemplateListSnapshot {
        private int schemaVersion;
        private List<TeamTemplateSnapshot> templates;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    static class TeamTemplateSnapshot {
        private String id;
        private String name;
        private String version;
        private String managerProfileJson;
        private String workersProfileJson;
        private String defaultSkills;
        private String defaultMcps;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    static class SkillBindingSnapshot {
        private int schemaVersion;
        private String roomId;
        private List<BindingSnapshot> bindings;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    static class BindingSnapshot {
        private String id;
        private String roomId;
        private String kind;
        private String productId;
        private String version;
        private String status;
        private LocalDateTime createdAt;
        private LocalDateTime deletedAt;
    }
}
