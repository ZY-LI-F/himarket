package com.alibaba.himarket.service.agent.impl;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.core.utils.IdGenerator;
import com.alibaba.himarket.dto.converter.agent.AgentTaskRunConverter;
import com.alibaba.himarket.dto.params.agent.StartTaskParam;
import com.alibaba.himarket.dto.result.agent.AgentStartTaskResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskEventResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunSummaryResult;
import com.alibaba.himarket.entity.agent.AgentTaskRunEntity;
import com.alibaba.himarket.repository.agent.AgentRoomRepository;
import com.alibaba.himarket.repository.agent.AgentTaskRunRepository;
import com.alibaba.himarket.service.agent.AgentTaskRunService;
import com.alibaba.himarket.service.agent.HiClawBridgeClient;
import com.alibaba.himarket.service.agent.TaskEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

@Service
@Slf4j
public class AgentTaskRunServiceImpl implements AgentTaskRunService {

    private static final String TASK_PREFIX = "task-";
    private static final String ROOM_RESOURCE = "AgentRoom";
    private static final String TASK_RESOURCE = "AgentTaskRun";
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_RUNNING = "RUNNING";
    private static final String STATUS_SUCCEEDED = "SUCCEEDED";
    private static final String STATUS_FAILED = "FAILED";
    private static final String EVENT_TASK_COMPLETED = "task.completed";
    private static final String EVENT_TASK_FAILED = "task.failed";
    private static final String AUTH_MISMATCH_MESSAGE =
            "userId conflicts with authenticated principal";
    private static final TypeReference<List<AgentTaskEventResult>> EVENT_LIST_TYPE =
            new TypeReference<>() {};

    private final AgentTaskRunRepository taskRunRepository;
    private final AgentRoomRepository roomRepository;
    private final AgentTaskRunConverter taskRunConverter;
    private final HiClawBridgeClient bridgeClient;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;
    private final ConcurrentMap<String, Sinks.Many<TaskEvent>> eventSinks =
            new ConcurrentHashMap<>();

    public AgentTaskRunServiceImpl(
            AgentTaskRunRepository taskRunRepository,
            AgentRoomRepository roomRepository,
            AgentTaskRunConverter taskRunConverter,
            HiClawBridgeClient bridgeClient,
            ObjectMapper objectMapper,
            PlatformTransactionManager transactionManager) {
        this.taskRunRepository = taskRunRepository;
        this.roomRepository = roomRepository;
        this.taskRunConverter = taskRunConverter;
        this.bridgeClient = bridgeClient;
        this.objectMapper = objectMapper;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    public List<AgentTaskRunSummaryResult> listTasks(String userId, String roomId) {
        String tenantId = resolveTenantId(userId);
        return transactionTemplate.execute(
                status -> {
                    findRoomForTenant(roomId, tenantId);
                    return taskRunRepository
                            .findByRoomUidAndTenantIdOrderByCreatedAtDesc(roomId, tenantId)
                            .stream()
                            .map(taskRunConverter::toSummary)
                            .toList();
                });
    }

    @Override
    public AgentStartTaskResult startTask(String userId, String roomId, StartTaskParam param) {
        String tenantId = resolveTenantId(userId);
        AgentTaskRunEntity pending = createPendingRun(roomId, tenantId, param);
        String localTaskId = pending.getTaskUid();
        try {
            String bridgeTaskId = submitBridgeTask(userId, roomId, localTaskId, param);
            markRunning(localTaskId, bridgeTaskId);
            sinkFor(bridgeTaskId);
            relayBridgeEvents(bridgeTaskId);
            return AgentStartTaskResult.builder()
                    .taskId(bridgeTaskId)
                    .status(STATUS_RUNNING)
                    .build();
        } catch (RuntimeException e) {
            TaskEvent event = failureEvent(localTaskId, e);
            TaskEvent persisted = persistEvent(localTaskId, event);
            publish(localTaskId, persisted);
            completeSink(localTaskId);
            log.error(
                    "Failed to start HiClaw bridge task: room={}, task={}", roomId, localTaskId, e);
            return AgentStartTaskResult.builder().taskId(localTaskId).status(STATUS_FAILED).build();
        }
    }

    @Override
    public AgentTaskRunResult getTask(String userId, String roomId, String taskId) {
        String tenantId = resolveTenantId(userId);
        return transactionTemplate.execute(
                status -> taskRunConverter.toResult(findTaskForTenant(taskId, roomId, tenantId)));
    }

    @Override
    public Flux<TaskEvent> streamTaskEvents(String userId, String roomId, String taskId) {
        String tenantId = resolveTenantId(userId);
        transactionTemplate.executeWithoutResult(
                status -> findTaskForTenant(taskId, roomId, tenantId));
        return sinkFor(taskId).asFlux();
    }

    private AgentTaskRunEntity createPendingRun(
            String roomId, String tenantId, StartTaskParam param) {
        return transactionTemplate.execute(
                status -> {
                    findRoomForTenant(roomId, tenantId);
                    LocalDateTime now = LocalDateTime.now();
                    AgentTaskRunEntity run =
                            AgentTaskRunEntity.builder()
                                    .taskUid(IdGenerator.genIdWithPrefix(TASK_PREFIX))
                                    .roomUid(roomId)
                                    .tenantId(tenantId)
                                    .status(STATUS_PENDING)
                                    .prompt(param.getPrompt())
                                    .planJson("{}")
                                    .eventsJson("[]")
                                    .artifactsJson("[]")
                                    .createdAt(now)
                                    .build();
                    return taskRunRepository.saveAndFlush(run);
                });
    }

    private String submitBridgeTask(
            String userId, String roomId, String localTaskId, StartTaskParam param) {
        String bridgeTaskId =
                bridgeClient.submitTask(
                        new HiClawBridgeClient.TaskSubmitRequest(
                                localTaskId,
                                userId,
                                roomId,
                                param.getPrompt(),
                                param.getFiles(),
                                param.getMode()));
        if (!StringUtils.hasText(bridgeTaskId)) {
            throw new IllegalStateException("HiClaw bridge returned blank taskId");
        }
        return bridgeTaskId;
    }

    private void markRunning(String localTaskId, String bridgeTaskId) {
        transactionTemplate.executeWithoutResult(
                status -> {
                    AgentTaskRunEntity run = findTask(localTaskId);
                    run.setTaskUid(bridgeTaskId);
                    run.setStatus(STATUS_RUNNING);
                    taskRunRepository.saveAndFlush(run);
                });
    }

    private void relayBridgeEvents(String taskId) {
        bridgeClient
                .streamEvents(taskId)
                .subscribe(
                        event -> {
                            TaskEvent persisted = persistEvent(taskId, event);
                            publish(taskId, persisted);
                            if (isTerminal(persisted)) {
                                completeSink(taskId);
                            }
                        },
                        error -> {
                            TaskEvent persisted = persistEvent(taskId, failureEvent(taskId, error));
                            publish(taskId, persisted);
                            completeSink(taskId);
                            log.error("HiClaw bridge SSE failed: task={}", taskId, error);
                        });
    }

    private TaskEvent persistEvent(String taskId, TaskEvent event) {
        return transactionTemplate.execute(
                status -> {
                    AgentTaskRunEntity run = findTask(taskId);
                    List<AgentTaskEventResult> events = readEvents(run);
                    TaskEvent normalized = withSequence(event, events.size());
                    List<AgentTaskEventResult> updatedEvents = new ArrayList<>(events);
                    updatedEvents.add(toResult(normalized));
                    run.setEventsJson(writeJson(updatedEvents));
                    updateState(run, normalized);
                    taskRunRepository.saveAndFlush(run);
                    return normalized;
                });
    }

    private void updateState(AgentTaskRunEntity run, TaskEvent event) {
        if (EVENT_TASK_FAILED.equals(event.getKind())) {
            run.setStatus(STATUS_FAILED);
            run.setFailureExcerpt(failureExcerpt(event));
            run.setCompletedAt(LocalDateTime.now());
            return;
        }
        if (EVENT_TASK_COMPLETED.equals(event.getKind())) {
            run.setStatus(STATUS_SUCCEEDED);
            run.setCompletedAt(LocalDateTime.now());
            return;
        }
        if (STATUS_PENDING.equals(run.getStatus())) {
            run.setStatus(STATUS_RUNNING);
        }
    }

    private List<AgentTaskEventResult> readEvents(AgentTaskRunEntity run) {
        try {
            return objectMapper.readValue(run.getEventsJson(), EVENT_LIST_TYPE);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, e, "Agent task events JSON");
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, e, "Agent JSON serialization");
        }
    }

    private TaskEvent withSequence(TaskEvent event, int nextSequence) {
        Integer sequence = event.getSeq() == null ? nextSequence : event.getSeq();
        return TaskEvent.builder()
                .seq(sequence)
                .kind(event.getKind())
                .agentId(event.getAgentId())
                .payload(event.getPayload())
                .timestamp(event.getTimestamp())
                .build();
    }

    private AgentTaskEventResult toResult(TaskEvent event) {
        return AgentTaskEventResult.builder()
                .seq(event.getSeq())
                .kind(event.getKind())
                .agentId(event.getAgentId())
                .payload(event.getPayload())
                .timestamp(event.getTimestamp())
                .build();
    }

    private TaskEvent failureEvent(String taskId, Throwable error) {
        return TaskEvent.builder()
                .kind(EVENT_TASK_FAILED)
                .agentId("bridge")
                .payload(Map.of("taskId", taskId, "stderr", failureExcerpt(error)))
                .timestamp(LocalDateTime.now())
                .build();
    }

    private String failureExcerpt(TaskEvent event) {
        if (event.getPayload() == null || event.getPayload().isEmpty()) {
            return "HiClaw bridge task failed";
        }
        for (String key : List.of("stderr", "error", "message", "detail", "excerpt")) {
            Object value = event.getPayload().get(key);
            if (value != null && StringUtils.hasText(value.toString())) {
                return value.toString();
            }
        }
        return event.getPayload().toString();
    }

    private String failureExcerpt(Throwable error) {
        String message = error.getMessage();
        if (StringUtils.hasText(message)) {
            return message;
        }
        return error.getClass().getName();
    }

    private void publish(String taskId, TaskEvent event) {
        Sinks.EmitResult result = sinkFor(taskId).tryEmitNext(event);
        if (result.isFailure()) {
            log.warn("Failed to publish task event: task={}, result={}", taskId, result);
        }
    }

    private void completeSink(String taskId) {
        Sinks.Many<TaskEvent> sink = eventSinks.remove(taskId);
        if (sink != null) {
            sink.tryEmitComplete();
        }
    }

    private Sinks.Many<TaskEvent> sinkFor(String taskId) {
        return eventSinks.computeIfAbsent(
                taskId, ignored -> Sinks.many().multicast().onBackpressureBuffer());
    }

    private boolean isTerminal(TaskEvent event) {
        return EVENT_TASK_COMPLETED.equals(event.getKind())
                || EVENT_TASK_FAILED.equals(event.getKind());
    }

    private void findRoomForTenant(String roomId, String tenantId) {
        roomRepository
                .findByRoomUidAndTenantIdAndDeletedAtIsNull(roomId, tenantId)
                .orElseThrow(
                        () -> new BusinessException(ErrorCode.NOT_FOUND, ROOM_RESOURCE, roomId));
    }

    private AgentTaskRunEntity findTaskForTenant(String taskId, String roomId, String tenantId) {
        return taskRunRepository
                .findByTaskUidAndRoomUidAndTenantId(taskId, roomId, tenantId)
                .orElseThrow(
                        () -> new BusinessException(ErrorCode.NOT_FOUND, TASK_RESOURCE, taskId));
    }

    private AgentTaskRunEntity findTask(String taskId) {
        return taskRunRepository
                .findByTaskUid(taskId)
                .orElseThrow(
                        () -> new BusinessException(ErrorCode.NOT_FOUND, TASK_RESOURCE, taskId));
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
}
