<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="row items-center justify-between">
              <div class="text-h6">날씨 이미지 관리</div>
              <div>
                <q-btn
                  color="primary"
                  icon="refresh"
                  label="이미지 수집"
                  @click="collectImage"
                  :loading="collecting"
                  class="q-mr-md"
                />
                <q-btn
                  color="warning"
                  icon="delete_sweep"
                  label="정리"
                  @click="showCleanupDialog = true"
                />
              </div>
            </div>
          </q-card-section>

          <q-card-section>
            <q-card flat bordered class="q-mb-md">
              <q-card-section>
                <div class="text-subtitle2">서비스 상태</div>
                <div v-if="status">
                  <div>상태: {{ status.status }}</div>
                  <div>최근 타임스탬프: {{ status.currentTimestamp }}</div>
                  <div v-if="status.error" class="text-negative">
                    오류: {{ status.error }}
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <q-table
              :rows="weatherImages"
              :columns="imageColumns"
              row-key="filename"
              :loading="loading"
              :rows-per-page-options="[10, 20, 50]"
            >
              <template v-slot:body-cell-size="props">
                <q-td :props="props">
                  {{ props.row.sizeMB }} MB
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Cleanup Dialog -->
    <q-dialog v-model="showCleanupDialog" persistent>
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">이미지 정리</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model.number="cleanupDays"
            type="number"
            label="보관할 일수"
            :rules="[val => val > 0 || '1 이상의 값을 입력하세요']"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="취소" color="primary" v-close-popup />
          <q-btn
            flat
            label="정리 실행"
            color="warning"
            @click="performCleanup"
            :loading="cleaning"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { weatherApi } from '../api/client';
import { useQuasar } from 'quasar';
import type { WeatherImage, WeatherStatus } from '../types/api';

const $q = useQuasar();
const weatherImages = ref<WeatherImage[]>([]);
const status = ref<WeatherStatus | null>(null);
const loading = ref(false);
const collecting = ref(false);
const cleaning = ref(false);
const showCleanupDialog = ref(false);
const cleanupDays = ref(7);

const imageColumns = [
  {
    name: 'filename',
    required: true,
    label: '파일명',
    align: 'left',
    field: 'filename',
    sortable: true
  },
  {
    name: 'size',
    label: '크기',
    align: 'right',
    field: 'sizeMB',
    sortable: true
  },
  {
    name: 'created',
    label: '생성일',
    align: 'left',
    field: 'created',
    format: (val: string) => new Date(val).toLocaleString('ko-KR'),
    sortable: true
  }
];

async function loadImages() {
  loading.value = true;
  try {
    const response = await weatherApi.getImages(50);
    if (response.success && response.data) {
      weatherImages.value = response.data.images;
    }
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '이미지 로딩 실패: ' + error.message
    });
  } finally {
    loading.value = false;
  }
}

async function loadStatus() {
  try {
    const response = await weatherApi.getStatus();
    if (response.success && response.data) {
      status.value = response.data;
    }
  } catch (error: any) {
    console.error('Status loading failed:', error);
  }
}

async function collectImage() {
  collecting.value = true;
  try {
    const response = await weatherApi.collect();
    if (response.success) {
      $q.notify({
        type: 'positive',
        message: '이미지 수집이 완료되었습니다'
      });
      await loadImages();
      await loadStatus();
    } else {
      throw new Error(response.error || '수집 실패');
    }
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '이미지 수집 실패: ' + error.message
    });
  } finally {
    collecting.value = false;
  }
}

async function performCleanup() {
  cleaning.value = true;
  try {
    const response = await weatherApi.cleanup(cleanupDays.value);
    if (response.success && response.data) {
      $q.notify({
        type: 'positive',
        message: `${response.data.deletedCount}개 파일이 삭제되었습니다`
      });
      showCleanupDialog.value = false;
      await loadImages();
    } else {
      throw new Error(response.error || '정리 실패');
    }
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '정리 실패: ' + error.message
    });
  } finally {
    cleaning.value = false;
  }
}

onMounted(() => {
  loadImages();
  loadStatus();
});
</script>

<style scoped lang="sass">
</style>


