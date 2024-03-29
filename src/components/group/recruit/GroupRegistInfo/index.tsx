import { SetStateAction, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { useRecoilState } from 'recoil';
import {
  groupRegistState,
  selectedPlaceState,
  tempFormState,
} from '@/recoil/GroupRegistState';

import { useRegistGroup } from '@/hooks/useRegist';
import { formatDueDate, formatTripDate } from '@/utils/dateUtil';
import { getGroupThumbnail } from '@/utils/localStorage';

import Input from '@/components/common/Input';
import DateInput from '@/components/common/DateInput';
import FileUploader from '@/components/common/uploader/FileUploader';

import * as S from '@components/group/recruit/GroupRegist.styles';
import Button from '@/components/common/Button';
import useRegistFormValidation from '@/hooks/useRegistFormValidation';
import Loader from '@/components/common/Loader';
import ErrorMessage from '@/components/common/Message/ErrorMessage';

export interface GroupRegistFromModel {
  groupTitle: string;
  groupDescription: string;
  groupMemberCount: number;
  departureDate: Date;
  recruitmentEndDate: Date;
  groupThumbnail?: File | null;
}

const DATE_ATTRIBUTES = [
  {
    name: 'departureDate',
    label: '여행 날짜 선택 *',
    rules: {
      required: '여행날짜를 입력해주세요.',
    },
    defaultValue: undefined,
  },
  {
    name: 'recruitmentEndDate',
    label: '모집 마감 날짜',
    defaultValue: undefined,
  },
];

function GroupRegistInfo({
  onSelectedStep,
  isEdit,
  editGroupID,
}: {
  onSelectedStep: (step: number) => void;
  isEdit?: boolean;
  editGroupID?: string;
}) {
  const [selectedPlace, setSelectedPlace] = useRecoilState(selectedPlaceState);
  const [tempFormData, setTempFormData] = useRecoilState(tempFormState);
  const [storedImgUrl, setStoredImgUrl] =
    useState<SetStateAction<string | null | undefined>>();

  const {
    register,
    handleSubmit,
    control,
    trigger,
    watch,
    setError,
    clearErrors,
    reset,
    formState: { errors, isValid, isSubmitting },
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      ...tempFormData,
    },
  });

  const recruitmentEndDate = watch('recruitmentEndDate');
  const departureDate = watch('departureDate');
  const { handleFormValidate } = useRegistFormValidation({
    trigger,
  });

  const {
    handleFormSubmit,
    handleSetOrder,
    handleFilterArea,
    isSubmitLoading,
  } = useRegistGroup();

  const resetRegisteredData = () => {
    reset({
      groupThumbnail: null,
    });
    setStoredImgUrl(undefined);
  };

  const onSubmit = async (data: GroupRegistFromModel, event?: any) => {
    if (selectedPlace.selectedPlace.length === 0) return;

    // console.log('폼 제출', data);
    // console.log('선택한 장소', selectedPlace.selectedPlace);

    try {
      // 각 카드에 orders 속성 추가
      const setOrderPlace = handleSetOrder(selectedPlace.selectedPlace);

      // 여행 날짜 데이터 포맷 변경
      const departureDate = formatTripDate(data.departureDate);

      // 마감 날짜가 있다면, 마감 날짜 데이터 포맷 변경
      const recruitmentEndDate = formatDueDate(data.recruitmentEndDate);

      // 지역 필터링
      const areaValue = handleFilterArea(selectedPlace.selectedPlace);

      const formPreprocessData = {
        name: data.groupTitle,
        content: data.groupDescription,
        maxMemberNumber: data.groupMemberCount,
        tripArea: areaValue,
        tripDate: departureDate,
        dueDate: recruitmentEndDate,
        places: [...setOrderPlace],
      };

      // 썸네일 이미지의 type이 string이면 아무 사진 없을 때와 동일하게 처리 -> 그룹 수정 시, 수정을 안했을 경우, 썸네일 이미지가 string으로 들어오기 때문
      let thumbnail;
      let originThumbnail;

      if (typeof data.groupThumbnail === 'string') {
        thumbnail = undefined;
        originThumbnail = true;
      } else {
        thumbnail = data.groupThumbnail;
        originThumbnail = false;
      }

      await handleFormSubmit(
        formPreprocessData,
        thumbnail,
        isEdit,
        editGroupID,
        originThumbnail
      );
    } catch (error) {
      console.log(error);
    }
  };

  // 모집 마감 날짜가 여행 날짜 이전인지 검증
  useEffect(() => {
    const existingError = errors['recruitmentEndDate'];

    if (recruitmentEndDate > departureDate && !existingError) {
      setError('recruitmentEndDate', {
        type: 'validate',
        message: '모집 마감 날짜는 여행 날짜 이전이어야 합니다.',
      });
    } else if (recruitmentEndDate <= departureDate && existingError) {
      clearErrors('recruitmentEndDate');
    }
  }, [recruitmentEndDate, departureDate, errors['recruitmentEndDate']]);

  // 다른 페이지 이동 시, 임시 폼 데이터 저장
  useEffect(() => {
    return () => {
      const tempFormData = { ...watch() };
      setTempFormData(tempFormData);
    };
  }, []);

  // 그룹 정보 페이지에 접근할 때, 그룹 썸네일 이미지가 있다면 불러오기
  useEffect(() => {
    const changeTempThumbnail = getGroupThumbnail();

    if (changeTempThumbnail) {
      setStoredImgUrl(changeTempThumbnail);
    } else if (tempFormData?.groupThumbnail) {
      setStoredImgUrl(tempFormData?.groupThumbnail);
    } else {
      setStoredImgUrl(undefined);
    }
  }, []);

  return (
    <S.GroupRegistContainer className="relative px-[28px] pt-[28px] flex flex-col">
      {isSubmitLoading && <Loader className="z-[1]" />}

      {/* 썸네일 업로더 */}
      <Controller
        name="groupThumbnail"
        control={control}
        render={({ field: { onChange } }) => (
          <FileUploader
            storedImgUrl={storedImgUrl}
            onFileSelected={(file) => {
              onChange(file);
            }}
            onFileDeleted={resetRegisteredData}
          />
        )}
      />

      <form
        className="flex flex-col h-full"
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={() => handleFormValidate(watch())}
      >
        {/* 여행 날짜 / 마감 날짜 선택 */}
        {DATE_ATTRIBUTES.map((item, index) => (
          <DateInput
            key={index}
            control={control}
            name={item.name}
            label={item.label}
            rules={item.rules}
            defaultValue={item.defaultValue}
            errors={errors}
          ></DateInput>
        ))}

        {/* 모집 인원 */}
        <Input
          inputType="input"
          type="number"
          label="모집 인원 *"
          style={{ width: '65px' }}
          oninput="this.value = this.value.replace(/[^0-9]/g, '');"
          {...register('groupMemberCount', {
            required: '모집 인원을 입력해주세요.',
            min: {
              value: 1,
              message: '모집 인원은 최소 1명 이상입니다.',
            },
            max: {
              value: 20,
              message: '모집 인원은 최대 20명까지 가능합니다.',
            },
            pattern: {
              value: /^[0-9]*$/,
              message: '숫자만 입력해 주세요.',
            },
          })}
          errors={errors}
        >
          <span className="ml-2 text-[13px]">명</span>
        </Input>

        {/* 그룹 이름 */}
        <Input
          inputType="input"
          label="그룹 이름 *"
          {...register('groupTitle', {
            required: '그룹 이름을 입력해주세요.',
          })}
          errors={errors}
        />

        {/* 그룹 설명 */}
        <Input
          inputType="textarea"
          label="그룹 설명"
          {...register('groupDescription')}
          errors={errors}
        />

        <div className="flex flex-col mt-auto pt-10 pb-12">
          {selectedPlace.selectedPlace.length == 0 && (
            <ErrorMessage className="mb-4">
              여행 일정을 등록해주세요.
            </ErrorMessage>
          )}

          <Button
            styleType={
              isValid &&
              selectedPlace.selectedPlace.length !== 0 &&
              !isSubmitting
                ? 'solid'
                : 'disabled'
            }
            fullWidth
          >
            그룹 모집하기
          </Button>
        </div>
      </form>
    </S.GroupRegistContainer>
  );
}

export default GroupRegistInfo;
