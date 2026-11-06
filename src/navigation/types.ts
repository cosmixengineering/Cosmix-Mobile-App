import type { OtpChallenge } from '../types/contracts';
import type { ServiceKey, RequestKind } from '../types/selfService';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type HomeStackParams = {
  HomeOverview: undefined;
  MySchedule: undefined;
  ApplyLeave: undefined;
};

export type WorkspaceTabParams = {
  Dashboard: NavigatorScreenParams<HomeStackParams> | undefined;
  Services: undefined;
  Attendance: undefined;
  History: { category?: ServiceKey } | undefined;
  Profile: undefined;
};

export type WorkspaceScreenProps<T extends keyof WorkspaceTabParams> =
  CompositeScreenProps<
    MaterialTopTabScreenProps<WorkspaceTabParams, T>,
    NativeStackScreenProps<RootStackParams>
  >;

export type RootStackParams = {
  Login: undefined;
  VerifyCode: { phoneNumber: string; challenge: OtpChallenge };
  Workspace: NavigatorScreenParams<WorkspaceTabParams>;
  ServiceDetail: { service: ServiceKey };
  RequestForm: { kind: RequestKind; previousRequestId?: string };
};
