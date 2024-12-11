import { createClient } from '@/supabase/client/server';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import 'server-only';
import {
  findLenderAliasesQuery,
  findLoanByAccountQuery,
  findPartnerByEmailQuery,
  getAbaRecordsQuery,
  getAdminFeesQuery,
  getAllFulfilmentCostsQuery,
  getAllOtherCostsQuery,
  getBatchByDate,
  getBatchQuery,
  getBusinessBankInfoQuery,
  getConsultantGroupQuery,
  getDetailedPartnerInformationQuery,
  getDetailedRctiRecordsForMonthQuery,
  getDetailedRctiRecordsQuery,
  getLenderAliasByNameQuery,
  getLenderAliasMappingQuery,
  getLenderByIdQuery,
  getLenderIdQuery,
  getManualAdjustmentsQuery,
  getMultiEntityRatesQuery,
  getPartnerAdminFeesQuery,
  getPartnerBankDetailsQuery,
  getPartnerFCUsageQuery,
  getPartnerManualAdjustmentsQuery,
  getPartnerOtherCostsQuery,
  getPartnersForAdminFeeQuery,
  getPartnersQuery,
  getPermissionsQuery,
  getProfilesQuery,
  getRctiRecordsQuery,
  getRoleAllowedPermissionsQuery,
  getRoleAllowedRoutesQuery,
  getRolesQuery,
  getRoutesQuery,
  getSettingsQuery,
  getTeamInvitesQuery,
  getTeamUserQuery,
  getUserQuery,
  getValidationFailedRecordsQuery,
  getValidationFailedUnResolvedRecordsQuery
} from '.';

export const getSession = cache(async () => {
  const supabase = createClient();

  return supabase.auth.getSession();
});

export const getTeamInvites = async () => {
  const supabase = createClient();

  const user = await getUser();
  const teamId = user?.data?.team_id;

  if (!teamId) {
    return;
  }

  return unstable_cache(
    async () => {
      return getTeamInvitesQuery(supabase, teamId);
    },
    ['team', 'invites', teamId],
    {
      tags: [`team_invites_${teamId}`],
      revalidate: 180
    }
  )();
};

export const getSettings = async ({ teamId }) => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getSettingsQuery(supabase, { teamId });
    },
    ['settings', teamId],
    {
      tags: [`team_settings_${teamId}`],
      revalidate: 30
    }
  )();
};

export const getUser = async () => {
  const {
    data: { session }
  } = await getSession();
  const userId = session?.user?.id;
  console.log('getUser userId', userId);

  if (!userId) {
    return null;
  }

  const supabase = createClient();
  // return getUserQuery(supabase, userId);

  return unstable_cache(
    async () => {
      return getUserQuery(supabase, userId);
    },
    ['user', userId],
    {
      tags: [`user_${userId}`],
      revalidate: 180
    }
  )();
};

export const getTeamUser = async () => {
  const supabase = createClient();
  const { data } = await getUser();
  console.log('getTeamUser data', data);

  return unstable_cache(
    async () => {
      return getTeamUserQuery(supabase, {
        userId: data.id,
        teamId: data.team_id
      });
    },
    ['team', 'user', data.id],
    {
      tags: [`team_user_${data.id}`],
      revalidate: 180
    }
  )();
};

export const getAdminFees = async () => {
  const supabase = createClient();

  return unstable_cache(
    async () => {
      return getAdminFeesQuery(supabase);
    },
    ['admin', 'fee'],
    {
      tags: ['admin_fees'],
      revalidate: 180
    }
  )();
};

export const getPartnerAdminFees = async ({ partnerId }) => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getPartnerAdminFeesQuery(supabase, { partnerId });
    },
    ['partner', 'admin', 'fee'],
    { tags: ['partner_admin_fees'], revalidate: 30 }
  )();
};

export const getPartnerFCUsage = async ({ partnerId, month, year }) => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getPartnerFCUsageQuery(supabase, { partnerId, month, year });
    },
    [`${partnerId}_FC_${month}_${year}`, 'partner_fc_usage'],
    { tags: [`${partnerId}_FC_${month}_${year}`], revalidate: 10 }
  )();
};

export const getPartnerOtherCosts = async ({ partnerId, month, year }) => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getPartnerOtherCostsQuery(supabase, { partnerId, month, year });
    },
    [`${partnerId}_other_costs_${month}_${year}`, 'partner_other_costs'],
    { tags: [`${partnerId}_other_costs_${month}_${year}`], revalidate: 10 }
  )();
};
export const getPartnerManualAdjustments = async ({
  partnerId,
  month,
  year
}) => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getPartnerManualAdjustmentsQuery(supabase, {
        partnerId,
        month,
        year
      });
    },
    [
      `${partnerId}_manual_adjustments_${month}_${year}`,
      'partner_manual_adjustments'
    ],
    {
      tags: [`${partnerId}_manual_adjustments_${month}_${year}`],
      revalidate: 10
    }
  )();
};

export const getBatchByDateFilter = async ({ startDate, endDate }) => {
  console.log('getBatchByDateFilter startDate, endDate', startDate, endDate);
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getBatchByDate(supabase, { startDate, endDate });
    },
    ['batch', 'filter_by_date'],
    { tags: ['batch_filter_by_date'], revalidate: 1 }
  )();
};

// export const getBatchValidationFailedRecods = async ({ batchId }) => {
//   const supabase = createClient();
//   return unstable_cache(
//     async () => {
//       return getBatchValidationFailedRecordsQuery(supabase, { batchId });
//     },
//     ["batch", "validation_failed", batchId],
//     { revalidate: 180, tags: [`validationfailed_${batchId}`] },
//   )();
// };

export const getValidationFailedRecords = async ({ batchId }) => {
  console.log('getValidationFailedRecords**', batchId);
  const supabase = createClient();
  return getValidationFailedRecordsQuery(supabase, { batchId });
  // return unstable_cache(
  //   async () => {
  //     return getValidationFailedRecordsQuery(supabase, { batchId });
  //   },
  //   ["batch", "validation_failed", batchId],
  //   { revalidate: 1, tags: [`validationfailed_${batchId}`] },
  // )();
};

export const getValidationFailedUnResolvedRecords = async ({ batchId }) => {
  console.log('getValidationFailedUnResolvedRecords**', batchId);
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getValidationFailedUnResolvedRecordsQuery(supabase, { batchId });
    },
    ['batch', 'validation_failed_unresolved', batchId],
    { revalidate: 5, tags: [`validationfailed_Unresolved_${batchId}`] }
  )();
};

export const findLoanByAccount = async ({ accountno }) => {
  console.log('findLoanByAccount', accountno);
  const supabase = createClient();
  return findLoanByAccountQuery(supabase, { accountno });
  // return unstable_cache(
  //   async () => {
  //     return findLoanByAccountQuery(supabase, { accountno });
  //   },
  //   ["loan", `loan_${accountno}`, accountno],
  //   { revalidate: 1, tags: [`loan_${accountno}`] },
  // )();
};
export const findPartnerByEmail = async ({ email }) => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return findPartnerByEmailQuery(supabase, { email });
    },
    ['partner', `partner_${email}`, email],
    { revalidate: 180, tags: [`partner_${email}`] }
  )();
};
export const findLenderAliases = async ({ lenderId }) => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return findLenderAliasesQuery(supabase, { lenderId });
    },
    ['lenderAliases', `lenderAliases_${lenderId}`, lenderId],
    { revalidate: 30, tags: [`lenderAliases_${lenderId}`] }
  )();
};

export const getAllPartners = async () => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getDetailedPartnerInformationQuery(supabase);
    },
    ['extended_partner_details'],
    { revalidate: 10, tags: ['extended_partner_details'] }
  )();
};

export const getConsultantGroups = async () => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getConsultantGroupQuery(supabase);
    },
    ['consultant_groups'],
    { revalidate: 10, tags: ['consultant_groups'] }
  )();
};

export const getProfiles = async () => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getProfilesQuery(supabase);
    },
    ['profiles'],
    { revalidate: 10, tags: ['profiles'] }
  )();
};

export const getRctiRecords = async ({ month, year }) => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getRctiRecordsQuery(supabase, { month, year });
    },
    ['rcti_records'],
    { revalidate: 30, tags: ['rcti_records'] }
  )();
};

export const getPartnerBankDetails = async () => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getPartnerBankDetailsQuery(supabase);
    },
    ['partner_bank_details'],
    { revalidate: 60, tags: ['partner_bank_details'] }
  )();
};

export const getBusinessBankInfo = async ({ teamId }) => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getBusinessBankInfoQuery(supabase, { teamId });
    },
    ['business_bank_details'],
    { revalidate: 60, tags: ['business_bank_details'] }
  )();
};

export const getAbaRecords = async ({ teamId }) => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getAbaRecordsQuery(supabase, { teamId });
    },
    ['aba_records'],
    { revalidate: 60, tags: ['aba_records'] }
  )();
};

export const getDetailedRctiRecords = async () => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getDetailedRctiRecordsQuery(supabase);
    },
    ['detailed_rcti_records'],
    { revalidate: 60, tags: ['detailed_rcti_records'] }
  )();
};

export const getDetailedRctiRecordsForMonth = async ({ month, year }) => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getDetailedRctiRecordsForMonthQuery(supabase, { month, year });
    },
    ['detailed_rcti_records'],
    { revalidate: 60, tags: ['detailed_rcti_records'] }
  )();
};

export const getLenderId = async ({ lenderName }) => {
  console.log('getLenderId lenderName', lenderName);
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getLenderIdQuery(supabase, { lenderName });
    },
    ['lenders', lenderName],
    { revalidate: 60, tags: [`lenders_${lenderName}`] }
  )();
};

export const getBatch = async ({ batchId }) => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getBatchQuery(supabase, { batchId });
    },
    ['batches', `batch_${batchId}`],
    { revalidate: 60, tags: [`batch_${batchId}`] }
  )();
};

export const getLenderAliasByName = async ({ aliasName }) => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getLenderAliasByNameQuery(supabase, { aliasName });
    },
    [`lender_aliases_${aliasName}`, `lender_aliases_${aliasName}`],
    { revalidate: 60, tags: [`lender_aliases_${aliasName}`] }
  )();
};

export const getLenderById = async ({ lenderId }) => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getLenderByIdQuery(supabase, { lenderId });
    },
    [`lenderId_${lenderId}`],
    { revalidate: 60, tags: [`lenderId_${lenderId}`] }
  )();
};

export const getRoles = async () => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getRolesQuery(supabase);
    },
    ['roles'],
    { revalidate: 60, tags: ['roles'] }
  )();
};

export const getRoutes = async () => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getRoutesQuery(supabase);
    },
    ['routes'],
    { revalidate: 60, tags: ['routes'] }
  )();
};

export const getPermissions = async () => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getPermissionsQuery(supabase);
    },
    ['permissions'],
    { revalidate: 60, tags: ['permissions'] }
  )();
};

export const getPartners = async () => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getPartnersQuery(supabase);
    },
    ['partners'],
    { revalidate: 60, tags: ['partners'] }
  )();
};

export const getManualAdjustments = async ({ month, year, type }) => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getManualAdjustmentsQuery(supabase, { month, year, type });
    },
    ['manual_adjustments'],
    { revalidate: 60, tags: ['manual_adjustments'] }
  )();
};

export const getLenderAliasMapping = async () => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getLenderAliasMappingQuery(supabase);
    },
    ['lender_alias_mapping'],
    { revalidate: 60, tags: ['lender_alias_mapping'] }
  )();
};

export const getAllFulfilmentCosts = async () => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getAllFulfilmentCostsQuery(supabase);
    },
    ['all_fulfilment_costs'],
    { revalidate: 60, tags: ['all_fulfilment_costs'] }
  )();
};

export const getAllOtherCosts = async () => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getAllOtherCostsQuery(supabase);
    },
    ['all_other_costs'],
    { revalidate: 60, tags: ['all_other_costs'] }
  )();
};

export const getRoleAllowedRoutes = async () => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getRoleAllowedRoutesQuery(supabase);
    },
    ['role_allowed_routes'],
    { revalidate: 60, tags: ['role_allowed_routes'] }
  )();
};

export const getRoleAllowedPermissions = async () => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getRoleAllowedPermissionsQuery(supabase);
    },
    ['role_allowed_permissions'],
    { revalidate: 60, tags: ['role_allowed_permissions'] }
  )();
};

export const getMultiEntityRates = async () => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getMultiEntityRatesQuery(supabase);
    },
    ['multi_entity_rates'],
    { revalidate: 60, tags: ['multi_entity_rates'] }
  )();
};

export const getPartnersForAdminFee = async ({ adminFeeId }) => {
  const supabase = createClient();
  return unstable_cache(
    async () => {
      return getPartnersForAdminFeeQuery(supabase, { adminFeeId });
    },
    ['partner_admin_fee'],
    { revalidate: 60, tags: ['partner_admin_fee'] }
  )();
};
