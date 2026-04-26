import { Alert, Button, Form, Input, Select, Space, Typography } from "antd";
import { Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EventTimeline } from "./EventTimeline";
import {
  listTeamTemplates,
  startRoomTask,
  subscribeRoomTaskEvents,
  type StartTaskRequest,
  type TaskEvent,
  type TaskEventUnsubscribe,
  type TeamTemplateList,
} from "../../lib/apis/agent";

interface TaskRunPanelProps {
  loadTeamTemplates?: () => Promise<TeamTemplateList>;
  roomId: string;
  startTask?: (
    roomId: string,
    data: StartTaskRequest
  ) => Promise<{ taskId: string; status: string }>;
  subscribeEvents?: typeof subscribeRoomTaskEvents;
}

interface TaskFormValues {
  prompt: string;
  teamTemplateId?: string;
}

function isTerminalEvent(event: TaskEvent) {
  return event.kind === "task.completed" || event.kind === "task.failed";
}

function teamTemplateOptions(templates: TeamTemplateList) {
  return templates.map(template => ({
    label: `${template.name} (${template.version})`,
    value: template.id,
  }));
}

export function TaskRunPanel({
  loadTeamTemplates = listTeamTemplates,
  roomId,
  startTask = startRoomTask,
  subscribeEvents = subscribeRoomTaskEvents,
}: TaskRunPanelProps) {
  const [form] = Form.useForm<TaskFormValues>();
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TeamTemplateList>([]);
  const unsubscribeRef = useRef<TaskEventUnsubscribe | null>(null);

  const closeSubscription = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);

  useEffect(() => {
    let mounted = true;
    void loadTeamTemplates()
      .then(nextTemplates => {
        if (mounted) setTemplates(nextTemplates);
      })
      .catch(requestError => {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Failed to load team templates";
        if (mounted) setError(message);
      });
    return () => {
      mounted = false;
    };
  }, [loadTeamTemplates]);

  useEffect(() => closeSubscription, [closeSubscription]);

  const handleEvent = useCallback(
    (event: TaskEvent) => {
      setEvents(current => [...current, event]);
      if (isTerminalEvent(event)) {
        closeSubscription();
        setRunning(false);
      }
    },
    [closeSubscription]
  );

  const submit = async (values: TaskFormValues) => {
    const prompt = values.prompt.trim();
    closeSubscription();
    setEvents([]);
    setTaskId(null);
    setRunning(true);
    setError(null);

    try {
      const payload: StartTaskRequest = {
        prompt,
        mode: "task",
        ...(values.teamTemplateId
          ? { teamTemplateId: values.teamTemplateId }
          : {}),
      };
      const task = await startTask(roomId, payload);
      setTaskId(task.taskId);
      unsubscribeRef.current = subscribeEvents({
        id: roomId,
        taskId: task.taskId,
        onEvent: handleEvent,
        onError: streamError => {
          const message =
            streamError instanceof Error
              ? streamError.message
              : "Task event stream failed";
          setError(message);
        },
      });
    } catch (requestError) {
      setRunning(false);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to submit task"
      );
    }
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-4"
      data-testid="agent-task-run-panel"
    >
      {error && <Alert message={error} showIcon type="error" />}
      <Form
        className="rounded-md border border-gray-100 bg-gray-50 p-3"
        form={form}
        layout="vertical"
        onFinish={values => void submit(values)}
      >
        <Form.Item
          label="Prompt"
          name="prompt"
          rules={[
            { required: true, whitespace: true, message: "Prompt is required" },
          ]}
        >
          <Input.TextArea
            disabled={running}
            placeholder="Describe the task for the agent team"
            rows={3}
          />
        </Form.Item>
        <Space className="w-full items-end" size="middle" wrap>
          <Form.Item
            className="min-w-64 flex-1"
            label="Team template override"
            name="teamTemplateId"
          >
            <Select
              allowClear
              disabled={running}
              options={teamTemplateOptions(templates)}
              placeholder="Use room default"
            />
          </Form.Item>
          <Button
            disabled={running}
            htmlType="submit"
            icon={<Send aria-hidden="true" size={16} />}
            loading={running}
            type="primary"
          >
            Submit task
          </Button>
        </Space>
      </Form>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-gray-100 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <Typography.Text strong>Event timeline</Typography.Text>
          {taskId && (
            <Typography.Text className="font-mono text-xs text-gray-500">
              {taskId}
            </Typography.Text>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <EventTimeline events={events} />
        </div>
      </div>
    </div>
  );
}
