<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="row items-center justify-between">
              <div class="text-h6">배치 작업 관리</div>
              <div>
                <q-btn
                  color="positive"
                  icon="check_circle"
                  label="모두 활성화"
                  @click="enableAll"
                  :loading="enablingAll"
                  class="q-mr-md"
                />
                <q-btn
                  color="negative"
                  icon="cancel"
                  label="모두 비활성화"
                  @click="disableAll"
                  :loading="disablingAll"
                />
              </div>
            </div>
          </q-card-section>

          <q-card-section>
            <div class="text-subtitle2 q-mb-md">스케줄러의 각 배치 작업을 개별적으로 켜고 끌 수 있습니다</div>

            <!-- Aviation Knowledge Batches -->
            <q-card flat bordered class="q-mb-md">
              <q-card-section>
                <div class="text-h6 q-mb-md">항공 지식 알림</div>

                <q-list separator>
                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="wb_sunny" color="orange" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>아침 알림 (9:00 AM KST)</q-item-label>
                      <q-item-label caption>
                        매일 오전 9시에 항공 지식을 발송합니다
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-toggle
                        v-model="batchStatus.morningKnowledge"
                        @update:model-value="(val) => toggleBatch('morningKnowledge', val)"
                        :loading="toggling.morningKnowledge"
                        color="primary"
                        size="lg"
                      />
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="wb_sunny" color="amber" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>오후 알림 (2:00 PM KST)</q-item-label>
                      <q-item-label caption>
                        매일 오후 2시에 항공 지식을 발송합니다
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-toggle
                        v-model="batchStatus.afternoonKnowledge"
                        @update:model-value="(val) => toggleBatch('afternoonKnowledge', val)"
                        :loading="toggling.afternoonKnowledge"
                        color="primary"
                        size="lg"
                      />
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="nightlight" color="indigo" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>저녁 알림 (8:00 PM KST)</q-item-label>
                      <q-item-label caption>
                        매일 오후 8시에 항공 지식을 발송합니다
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-toggle
                        v-model="batchStatus.eveningKnowledge"
                        @update:model-value="(val) => toggleBatch('eveningKnowledge', val)"
                        :loading="toggling.eveningKnowledge"
                        color="primary"
                        size="lg"
                      />
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>

            <!-- Weather Batches -->
            <q-card flat bordered>
              <q-card-section>
                <div class="text-h6 q-mb-md">날씨 이미지 수집</div>

                <q-list separator>
                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="cloud_download" color="blue" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>날씨 이미지 수집 (10분마다)</q-item-label>
                      <q-item-label caption>
                        10분마다 위성 날씨 이미지를 자동으로 수집합니다
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-toggle
                        v-model="batchStatus.weatherCollection"
                        @update:model-value="(val) => toggleBatch('weatherCollection', val)"
                        :loading="toggling.weatherCollection"
                        color="primary"
                        size="lg"
                      />
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="delete_sweep" color="red" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>날씨 이미지 정리 (매일 3:00 AM KST)</q-item-label>
                      <q-item-label caption>
                        7일 이상 된 오래된 날씨 이미지를 삭제합니다
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-toggle
                        v-model="batchStatus.weatherCleanup"
                        @update:model-value="(val) => toggleBatch('weatherCleanup', val)"
                        :loading="toggling.weatherCleanup"
                        color="primary"
                        size="lg"
                      />
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>
          </q-card-section>

          <q-card-section>
            <q-banner v-if="lastUpdate" class="bg-blue-1">
              <template v-slot:avatar>
                <q-icon name="info" color="primary" />
              </template>
              마지막 업데이트: {{ lastUpdate }}
            </q-banner>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { batchApi } from '../api/client';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const batchStatus = reactive({
  morningKnowledge: true,
  afternoonKnowledge: true,
  eveningKnowledge: true,
  weatherCollection: true,
  weatherCleanup: true
});

const toggling = reactive({
  morningKnowledge: false,
  afternoonKnowledge: false,
  eveningKnowledge: false,
  weatherCollection: false,
  weatherCleanup: false
});

const enablingAll = ref(false);
const disablingAll = ref(false);
const lastUpdate = ref<string>('');

async function loadBatchStatus() {
  try {
    const response = await batchApi.getStatus();
    if (response.success && response.data) {
      Object.assign(batchStatus, response.data.batches);
      lastUpdate.value = new Date().toLocaleString('ko-KR');
    }
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '배치 상태 로딩 실패: ' + (error.message || error)
    });
  }
}

async function toggleBatch(batchName: keyof typeof batchStatus, enabled: boolean) {
  toggling[batchName] = true;
  try {
    const response = await batchApi.setBatchEnabled(batchName, enabled);
    if (response.success) {
      batchStatus[batchName] = enabled;
      lastUpdate.value = new Date().toLocaleString('ko-KR');
      $q.notify({
        type: 'positive',
        message: response.data?.message || `배치 ${batchName}이(가) ${enabled ? '활성화' : '비활성화'}되었습니다`
      });
    } else {
      // Revert toggle on error
      batchStatus[batchName] = !enabled;
      throw new Error(response.error || '설정 변경 실패');
    }
  } catch (error: any) {
    // Revert toggle on error
    batchStatus[batchName] = !enabled;
    $q.notify({
      type: 'negative',
      message: '설정 변경 실패: ' + (error.message || error)
    });
  } finally {
    toggling[batchName] = false;
  }
}

async function enableAll() {
  enablingAll.value = true;
  try {
    const response = await batchApi.enableAll();
    if (response.success) {
      // Set all to true
      Object.keys(batchStatus).forEach(key => {
        (batchStatus as any)[key] = true;
      });
      lastUpdate.value = new Date().toLocaleString('ko-KR');
      $q.notify({
        type: 'positive',
        message: response.data?.message || '모든 배치가 활성화되었습니다'
      });
    } else {
      throw new Error(response.error || '활성화 실패');
    }
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '활성화 실패: ' + (error.message || error)
    });
  } finally {
    enablingAll.value = false;
  }
}

async function disableAll() {
  disablingAll.value = true;
  try {
    const response = await batchApi.disableAll();
    if (response.success) {
      // Set all to false
      Object.keys(batchStatus).forEach(key => {
        (batchStatus as any)[key] = false;
      });
      lastUpdate.value = new Date().toLocaleString('ko-KR');
      $q.notify({
        type: 'positive',
        message: response.data?.message || '모든 배치가 비활성화되었습니다'
      });
    } else {
      throw new Error(response.error || '비활성화 실패');
    }
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '비활성화 실패: ' + (error.message || error)
    });
  } finally {
    disablingAll.value = false;
  }
}

onMounted(() => {
  loadBatchStatus();
});
</script>

<style scoped lang="sass">
</style>
