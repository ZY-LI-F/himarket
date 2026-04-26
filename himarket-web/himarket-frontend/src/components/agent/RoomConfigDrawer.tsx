import {
  Alert,
  Button,
  Drawer,
  Form,
  Select,
  Space,
  Spin,
  Typography,
  message,
} from "antd";
import type { FormInstance } from "antd";
import { Settings } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getRoomConfig,
  listTeamTemplates,
  updateRoomConfig,
  type BindingRef,
  type RoomConfig,
} from "../../lib/apis/agent";
import { getProducts } from "../../lib/apis/product";

const DEFAULT_BINDING_VERSION = "1.0.0";
const ACTIVE_BINDING_STATUS = "ACTIVE";

interface SelectOption {
  label: string;
  value: string;
  version?: string;
}

export interface RoomConfigOptionGroups {
  mcps: SelectOption[];
  models: SelectOption[];
  skills: SelectOption[];
  teamTemplates: SelectOption[];
}

interface RoomConfigFormValues {
  mcpBindingIds: string[];
  modelId: string;
  skillBindingIds: string[];
  teamTemplateId: string;
}

interface RoomConfigDrawerProps {
  defaultOpen?: boolean;
  getConfig?: (roomId: string) => Promise<RoomConfig>;
  loadOptions?: () => Promise<RoomConfigOptionGroups>;
  refreshKey?: number;
  roomId?: string;
  saveConfig?: (roomId: string, config: RoomConfig) => Promise<RoomConfig>;
}

interface ControllerParams extends Required<
  Omit<RoomConfigDrawerProps, "roomId">
> {
  roomId?: string;
}

interface SaveConfigParams {
  config: RoomConfig;
  form: FormInstance<RoomConfigFormValues>;
  options: RoomConfigOptionGroups;
  roomId: string;
  saveConfig: (roomId: string, config: RoomConfig) => Promise<RoomConfig>;
}

function bindingIds(bindings: BindingRef[]) {
  return bindings.map(binding => binding.productId);
}

function option(value: string, label?: string, version?: string): SelectOption {
  return { value, label: label || value, version };
}

function mergeOptions(current: RoomConfig, groups: RoomConfigOptionGroups) {
  return {
    mcps: mergeBindingOptions(current.mcpBindings, groups.mcps),
    models: mergeIdOption(current.modelId, groups.models),
    skills: mergeBindingOptions(current.skillBindings, groups.skills),
    teamTemplates: mergeIdOption(current.teamTemplateId, groups.teamTemplates),
  };
}

function mergeIdOption(value: string, options: SelectOption[]) {
  if (options.some(item => item.value === value)) return options;
  return [option(value), ...options];
}

function mergeBindingOptions(bindings: BindingRef[], options: SelectOption[]) {
  const missing = bindings
    .filter(binding => !options.some(item => item.value === binding.productId))
    .map(binding => option(binding.productId, undefined, binding.version));
  return [...missing, ...options];
}

function buildFormValues(config: RoomConfig): RoomConfigFormValues {
  return {
    mcpBindingIds: bindingIds(config.mcpBindings),
    modelId: config.modelId,
    skillBindingIds: bindingIds(config.skillBindings),
    teamTemplateId: config.teamTemplateId,
  };
}

function bindingRefs(
  ids: string[],
  knownBindings: BindingRef[],
  options: SelectOption[]
) {
  const known = new Map(
    knownBindings.map(binding => [binding.productId, binding])
  );
  const versions = new Map(options.map(item => [item.value, item.version]));
  return ids.map(productId => ({
    productId,
    version:
      known.get(productId)?.version ||
      versions.get(productId) ||
      DEFAULT_BINDING_VERSION,
    status: known.get(productId)?.status || ACTIVE_BINDING_STATUS,
  }));
}

async function fetchConfigSnapshot(params: {
  getConfig: (roomId: string) => Promise<RoomConfig>;
  loadOptions: () => Promise<RoomConfigOptionGroups>;
  roomId: string;
}) {
  const [config, groups] = await Promise.all([
    params.getConfig(params.roomId),
    params.loadOptions(),
  ]);
  return { config, options: mergeOptions(config, groups) };
}

async function saveConfigSnapshot(params: SaveConfigParams) {
  const values = await params.form.validateFields();
  return params.saveConfig(params.roomId, {
    ...params.config,
    modelId: values.modelId,
    teamTemplateId: values.teamTemplateId,
    skillBindings: bindingRefs(
      values.skillBindingIds,
      params.config.skillBindings,
      params.options.skills
    ),
    mcpBindings: bindingRefs(
      values.mcpBindingIds,
      params.config.mcpBindings,
      params.options.mcps
    ),
  });
}

async function loadProductOptions(type: string): Promise<SelectOption[]> {
  const response = await getProducts({ type, page: 0, size: 100 });
  if (response.code !== "SUCCESS") {
    throw new Error(response.message || `加载 ${type} 失败`);
  }
  return response.data.content.map(product =>
    option(product.productId, product.name, product.skillConfig?.currentVersion)
  );
}

export async function loadRoomConfigOptions(): Promise<RoomConfigOptionGroups> {
  const [models, skills, mcps, templates] = await Promise.all([
    loadProductOptions("MODEL_API"),
    loadProductOptions("AGENT_SKILL"),
    loadProductOptions("MCP_SERVER"),
    listTeamTemplates(),
  ]);
  return {
    mcps,
    models,
    skills,
    teamTemplates: templates.map(template =>
      option(template.id, template.name, template.version)
    ),
  };
}

function useRoomConfigController({
  defaultOpen,
  getConfig,
  loadOptions,
  refreshKey,
  roomId,
  saveConfig,
}: ControllerParams) {
  const [form] = Form.useForm<RoomConfigFormValues>();
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<RoomConfig | null>(null);
  const [options, setOptions] = useState<RoomConfigOptionGroups>({
    mcps: [],
    models: [],
    skills: [],
    teamTemplates: [],
  });

  const canOpen = Boolean(roomId);
  const drawerTitle = useMemo(
    () => `Room Config${roomId ? `: ${roomId}` : ""}`,
    [roomId]
  );

  const loadConfig = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const snapshot = await fetchConfigSnapshot({
        getConfig,
        loadOptions,
        roomId,
      });
      setConfig(snapshot.config);
      setOptions(snapshot.options);
      form.setFieldsValue(buildFormValues(snapshot.config));
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "加载配置失败"
      );
    } finally {
      setLoading(false);
    }
  }, [form, getConfig, loadOptions, roomId]);

  useEffect(() => {
    if (open || refreshKey) void loadConfig();
  }, [loadConfig, open, refreshKey]);

  const submit = async () => {
    if (!roomId || !config) return;
    setSaving(true);
    try {
      const saved = await saveConfigSnapshot({
        config,
        form,
        options,
        roomId,
        saveConfig,
      });
      setConfig(saved);
      form.setFieldsValue(buildFormValues(saved));
      message.success("房间配置已保存");
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "保存配置失败"
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    canOpen,
    config,
    drawerTitle,
    error,
    form,
    loading,
    open,
    options,
    saving,
    setOpen,
    submit,
  };
}

function DrawerBody(props: {
  error: string | null;
  form: FormInstance<RoomConfigFormValues>;
  loading: boolean;
  options: RoomConfigOptionGroups;
}) {
  if (props.loading) return <Spin />;
  return (
    <Space className="w-full" orientation="vertical" size="middle">
      {props.error && <Alert message={props.error} showIcon type="error" />}
      <Form form={props.form} layout="vertical">
        <Form.Item label="模型" name="modelId" rules={[{ required: true }]}>
          <Select options={props.options.models} showSearch />
        </Form.Item>
        <Form.Item
          label="团队模板"
          name="teamTemplateId"
          rules={[{ required: true }]}
        >
          <Select options={props.options.teamTemplates} showSearch />
        </Form.Item>
        <Form.Item label="Skills" name="skillBindingIds">
          <Select mode="multiple" options={props.options.skills} showSearch />
        </Form.Item>
        <Form.Item label="MCPs" name="mcpBindingIds">
          <Select mode="multiple" options={props.options.mcps} showSearch />
        </Form.Item>
      </Form>
    </Space>
  );
}

export function RoomConfigDrawer({
  defaultOpen = false,
  getConfig = getRoomConfig,
  loadOptions = loadRoomConfigOptions,
  refreshKey = 0,
  roomId,
  saveConfig = updateRoomConfig,
}: RoomConfigDrawerProps) {
  const controller = useRoomConfigController({
    defaultOpen,
    getConfig,
    loadOptions,
    refreshKey,
    roomId,
    saveConfig,
  });

  return (
    <div className="flex h-full flex-col gap-3">
      {!controller.canOpen && <Alert message="缺少房间 ID" type="warning" />}
      <Button
        disabled={!controller.canOpen}
        icon={<Settings aria-hidden="true" size={16} />}
        onClick={() => controller.setOpen(true)}
        type="primary"
      >
        编辑配置
      </Button>
      {controller.config && (
        <Space orientation="vertical" size={2}>
          <Typography.Text className="text-xs text-gray-500">
            {controller.config.modelId} / {controller.config.teamTemplateId}
          </Typography.Text>
          <Typography.Text className="text-xs text-gray-500">
            Skills {controller.config.skillBindings.length} · MCPs{" "}
            {controller.config.mcpBindings.length}
          </Typography.Text>
        </Space>
      )}
      <Drawer
        destroyOnHidden
        extra={
          <Button
            loading={controller.saving}
            onClick={() => void controller.submit()}
            type="primary"
          >
            保存
          </Button>
        }
        onClose={() => controller.setOpen(false)}
        open={controller.open}
        title={controller.drawerTitle}
        size="default"
      >
        <DrawerBody
          error={controller.error}
          form={controller.form}
          loading={controller.loading}
          options={controller.options}
        />
      </Drawer>
    </div>
  );
}
