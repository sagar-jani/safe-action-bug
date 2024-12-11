import { BatchStatus } from '@/utils/Constants';
import { EMPTY_FOLDER_PLACEHOLDER_FILE_NAME } from '../storage';

export async function getCurrentUserTeamQuery(supabase) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return;
  }

  return getUserQuery(supabase, session.user?.id);
}
export async function updateBatchAggregate(
  supabase,
  { totalTrail, totalUpfront, totalNumRecords, batchId }
) {
  return supabase
    .from('batch')
    .update({
      trail: totalTrail,
      upfront: totalUpfront,
      records: totalNumRecords
    })
    .eq('id', batchId);
}

export async function getBatchValidationFailedRecordsQuery(
  supabase,
  { batchId }
) {
  return supabase
    .from('validationfailed')
    .select('id, isresolved')
    .eq('batchid', batchId);
}

export async function getBatchAggregates(supabase, { batchId, batchStatus }) {
  const { data: records, error } = await supabase
    .from(
      batchStatus === BatchStatus.Finished
        ? 'monthlyloandata'
        : 'validationfailed'
    )
    .select('*')
    .eq('batchid', batchId);

  if (error) {
    console.error('Error fetching batch aggregates:', error);
    throw error;
  }

  if (!records) {
    console.warn('No records found for batch:', batchId);
    return { totalTrail: 0, totalUpfront: 0, totalNumRecords: 0 };
  }

  const totalTrail = records.reduce((accumulator, record) => {
    return accumulator + (record.trailcommission || 0) + (record.gst || 0);
  }, 0);
  const totalUpfront = records.reduce((accumulator, record) => {
    return (
      accumulator + (record.upfrontcommission || 0) + (record.upfront_gst || 0)
    );
  }, 0);

  return { totalTrail, totalUpfront, totalNumRecords: records.length };
}

export async function getProfilesQuery(supabase) {
  return supabase.from('profiles').select('id, name');
}

export async function getUserInviteQuery(supabase, params) {
  console.log('getUserInviteQuery', params);
  return supabase
    .from('user_invites')
    .select('*')
    .eq('code', params.code)
    .eq('email', params.email)
    .single();
}

export async function joinTeamByInviteCode(supabase, code) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  console.log('**session?.user.email', session?.user.email);

  if (!session?.user.email) {
    return;
  }

  const { data: inviteData } = await getUserInviteQuery(supabase, {
    code,
    email: session.user.email
  });

  console.log('**inviteData', inviteData);

  if (inviteData) {
    // Add user team
    await supabase.from('users_on_team').insert({
      user_id: session.user.id,
      team_id: inviteData?.team_id,
      role: inviteData.role
    });

    console.log('session.user.id', session.user.id);

    // Set current team
    const { data } = await supabase
      .from('profiles')
      .update({
        team_id: inviteData?.team_id
      })
      .eq('id', session.user.id)
      .select()
      .single();

    // remove invite
    await supabase.from('user_invites').delete().eq('code', code);

    return data;
  }

  return null;
}

export async function leaveTeam(supabase, params) {
  await supabase
    .from('users')
    .update({
      team_id: null
    })
    .eq('id', params.userId)
    .eq('team_id', params.teamId);

  return supabase
    .from('users_on_team')
    .delete()
    .eq('team_id', params.teamId)
    .eq('user_id', params.userId)
    .select()
    .single();
}

export async function updateUserTeamRole(supabase, params) {
  const { role, userId, teamId } = params;

  return supabase
    .from('users_on_team')
    .update({
      role
    })
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .select()
    .single();
}

export async function getTeamUser(supabase) {
  const { data: user } = await getUserQuery(supabase);

  const { data } = await supabase
    .from('users_on_team')
    .select(
      `
      id,
      role,
      team_id,
      user:profiles(id, name, avatar_url, email)
    `
    )
    .eq('team_id', user.team_id)
    .eq('user_id', user.id)
    .throwOnError()
    .single();

  return {
    data
  };
}

export async function getTeamUserQuery(supabase, params) {
  console.log('**getTeamUserQuery', params);
  const { data } = await supabase
    .from('users_on_team')
    .select(
      `
      id,
      role,
      team_id,
      user:profiles(id, name, avatar_url, email)
    `
    )
    .eq('team_id', params.teamId)
    .eq('user_id', params.userId)
    .throwOnError()
    .single();

  return {
    data
  };
}

export async function getTeamMembersQuery(supabase, teamId) {
  console.log('getTeamMembersQuery**', teamId);
  const { data } = await supabase
    .from('users_on_team')
    .select(
      `
      id,
      role,
      team_id,
      user:profiles(id, name, avatar_url, email)
    `
    )
    .eq('team_id', teamId)
    .order('created_at')
    .throwOnError();

  return {
    data
  };
}

export async function deleteTeamMember(supabase, params) {
  return supabase
    .from('users_on_team')
    .delete()
    .eq('user_id', params.userId)
    .eq('team_id', params.teamId)
    .select()
    .single();
}

export async function getSettingsQuery(supabase, { teamId }) {
  const { data, error } = await supabase
    .from('settings')
    .select('settings')
    .eq('team_id', teamId)
    .single(); // Ensure only a single row is returned

  if (error) {
    console.error('Error fetching settings:', error);
    return {}; // Return null or handle the error as needed
  }

  // If no data is found (data is null), return an empty object
  return data?.settings || {}; // Return settings if found, otherwise empty object
}

export async function getTeamInvitesQuery(supabase, teamId) {
  return supabase
    .from('user_invites')
    .select('id, email, code, role, user:invited_by(*), team:team_id(*)')
    .eq('team_id', teamId)
    .throwOnError();
}

export async function getAdminFeesQuery(supabase) {
  return supabase
    .from('admin_fees')
    .select(
      `
    *,
    profiles:created_by (
      name
    )
  `
    )
    .throwOnError();
}
export async function getPartnerAdminFeesQuery(supabase, { partnerId }) {
  return supabase
    .from('partner_admin_fees')
    .select(
      `
      admin_fee_id,
      admin_fees:admin_fees(id, name, charge, gst_amount)
    `
    )
    .eq('partner_id', partnerId)

    .throwOnError();
}

export async function getPartnerOtherCostsQuery(
  supabase,
  { partnerId, month, year }
) {
  return supabase
    .from('other_costs')
    .select('*')
    .eq('partner_id', partnerId)
    .eq('month', month)
    .eq('year', year);
}

export async function getPartnerManualAdjustmentsQuery(
  supabase,
  { partnerId, month, year }
) {
  return supabase
    .from('manual_adjustments')
    .select('*')
    .eq('partner_id', partnerId)
    .eq('month', month)
    .eq('year', year);
}

export async function getPartnerFCUsageQuery(
  supabase,
  { partnerId, month, year }
) {
  console.log('getPartnerFCUsageQuery**', partnerId, month, year);
  const { data, error } = await supabase
    .from('fulfilment_costs')
    .select(
      `
      id,
      hours_worked,
      deal_title,
      fulfilment_split,
      fulfilment_rate,
      total_cost,
      net_cost
    `
    )
    .eq('partner_id', partnerId)
    .eq('month', month)
    .eq('year', year);

  if (error) throw error;

  console.log('getPartnerFCUsageQuery', data);

  // Group and format the data
  const groupedData = data.reduce((acc, item) => {
    const key = item.deal_title;
    if (!acc[key]) {
      acc[key] = {
        hours: 0,
        rate: item.fulfilment_rate,
        total_cost: 0,
        split_rate: 0,
        net_cost: 0
      };
    }
    acc[key].hours += item.hours_worked;
    acc[key].total_cost += item.total_cost;
    acc[key].split_rate += item.fulfilment_split;
    acc[key].net_cost += item.net_cost;
    return acc;
  }, {});

  // Format the result
  return Object.entries(groupedData).map(([key, value]) => ({
    description: key,
    amount: value.total_cost,
    hours: value.hours,
    rate: value.rate,
    split_rate: value.split_rate,
    net_amount: value.net_cost
  }));
}

export async function getUserQuery(supabase, userId) {
  console.log('userId', userId);
  return supabase
    .from('profiles')
    .select(
      `
      *,
      teams:team_id(*)
    `
    )
    .eq('id', userId)
    .single()
    .throwOnError();
}

export async function getLenderConfig(supabase, funderName) {
  const { data: lender } = await supabase
    .from('lenders')
    .select('id')
    .eq('name', funderName)
    .single();
  console.log('getLenderConfig', lender?.id);

  return supabase
    .from('lender_mappings')
    .select('*')
    .eq('lender_id', lender?.id)
    .single();
}

export async function getBatchQuery(supabase, { batchId }) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const userId = session?.user.id;

  if (!userId) {
    return null;
  }

  return supabase
    .from('batch')
    .select('filename, status')
    .eq('id', batchId)
    .single()
    .throwOnError();
}

export async function getBatchByDate(supabase, { startDate, endDate }) {
  let query = supabase
    .from('batch')
    .select('*')
    .order('createdat', { ascending: false });

  if (startDate) {
    query = query.gte('createdat', startDate);
  }

  if (endDate) {
    query = query.lte('createdat', endDate);
  }

  return query.order('createdat', { ascending: false }).throwOnError();
}

export async function getBatchData(supabase, batchId) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const userId = session?.user.id;

  if (!userId) {
    return null;
  }

  return supabase
    .from('batch')
    .select('*')
    .eq('id', batchId)
    .single()
    .throwOnError();
}

export async function getPartnerInfo(supabase) {
  return supabase.from('consultants').select('*');
}

export async function addMonthlyLoandata(
  supabase,
  loanId,
  batchId,
  trailCommission,
  gst,
  upfrontCommission,
  loanBalance,
  funderExtraFields
) {
  return supabase
    .from('monthlyloandata')
    .insert({
      loanid: loanId,
      batchid: batchId,
      trailcommission: trailCommission,
      gst: gst,
      upfrontcommission: upfrontCommission,
      loanbalance: loanBalance,
      funderextrafields: funderExtraFields
    })
    .select();
}

export async function findValidationRecords(supabase, accountNo, batchId) {
  return supabase
    .from('validationfailed')
    .select('*')
    .eq('accountno', accountNo)
    .eq('batchid', batchId);
}

//Assuming there is always one record with accountNo, batchId combination
export async function resolveAcknowledgedException(
  supabase,
  accountNo,
  batchId
) {
  console.log('resolveAcknowledgedException', accountNo, batchId);
  return supabase
    .from('acknowledgedexceptions')
    .update({ isresolved: true, resolvereason: 'User resolved the loan !' })
    .eq('accountno', accountNo)
    .eq('batchid', batchId);
}

/**
 * Assuming there is always one record with batchId and accountNo in validationfailed;
 * even if there are two entries for same accountNo incase more than one trail commision comes as part of same funder file,
 * then both the records need to be resolved.
 */

export async function resolveValidation(supabase, accountNo, batchId, loanId) {
  return await supabase
    .from('validationfailed')
    .update({
      isresolved: true,
      resolvereason: 'User updated the loan info !',
      loanid: loanId
    })
    .eq('accountno', accountNo)
    .eq('batchid', batchId);
}

export async function getResolvedExceptions(supabase) {
  return supabase
    .from('acknowledgedexceptions')
    .select('*')
    .eq('isresolved', false);
}

export async function getAllExceptions(supabase) {
  return supabase.from('acknowledgedexceptions').select('*');
}

/**
 * This might fail if a funder file has multiple records for the same borrower.
 * TODO: handle multiple rows (same borrower)
 */

export async function validateLoanExists(
  supabase,
  accountNo,
  lender,
  borrower
) {
  return supabase
    .from('loans')
    .select('id')
    .eq('accountno', accountNo)
    .ilike('borrower', borrower)
    .ilike('lender', lender)
    .single();
}

export async function insertAcknowledgedException(
  supabase,
  validationFailedRecord
) {
  return supabase
    .from('acknowledgedexceptions')
    .insert({
      batchid: validationFailedRecord.batchid,
      accountno: validationFailedRecord.accountno,
      borrower: validationFailedRecord.borrower,
      lender: validationFailedRecord.lender,
      trailcommission: validationFailedRecord.trailcommission,
      gst: validationFailedRecord.gst,
      upfrontcommission: validationFailedRecord.upfrontcommission,
      loanbalance: validationFailedRecord.loanbalance,
      funderextrafields: validationFailedRecord.funderrxtrafields,
      isresolved: validationFailedRecord.isresolved,
      resolvereason: validationFailedRecord.resolvereason
    })
    .single()
    .throwOnError();
}

export async function deleteValFailedRecord(supabase, validationFailedRecord) {
  return supabase
    .from('validationfailed')
    .delete()
    .eq('id', validationFailedRecord.id)
    .single()
    .throwOnError();
}

export async function updateUpfrontCommValidationFail(
  supabase,
  accountNo,
  batchId,
  upfrontcommission
) {
  const { data, error } = await supabase
    .from('validationfailed')
    .update({ upfrontcommission })
    .eq('accountno', accountNo)
    .eq('batchid', batchId)
    .throwOnError();

  console.error('error', error);
  console.error('data', data);
}

export async function insertFailedUpfrontClawback(supabase, record, batchId) {
  console.log('record insertFailedUpfrontClawback', record);
  const { accountno, lender, borrower, upfrontcommission, gst, upfront_gst } =
    record;

  return supabase
    .from('validationfailed')
    .insert({
      accountno,
      lender,
      borrower,
      upfrontcommission,
      gst,
      batchid: batchId,
      upfront_gst
    })
    .single();
}

export async function insertFoundUpfrontClawbackToValidationFailed(
  supabase,
  record,
  batchId
) {
  const {
    accountno,
    lender,
    borrower,
    upfrontcommission,
    gst,
    loan,
    upfront_gst,
    isresolved
  } = record;

  return supabase
    .from('validationfailed')
    .insert({
      accountno,
      lender,
      borrower,
      upfrontcommission,
      gst,
      batchid: batchId,
      loanid: loan?.id,
      upfront_gst,
      isresolved
    })
    .single();
}

export async function insertNilTrailReasonFailed(supabase, record, batchId) {
  console.log('insertNilTrailReasonFailed', insertNilTrailReasonFailed);
  const {
    accountno,
    lender,
    borrower,
    niltrailreason,
    loanbalance,
    settlementdate
  } = record;

  return supabase
    .from('validationfailed')
    .insert({
      accountno,
      lender,
      borrower,
      batchid: batchId,
      niltrailreason,
      loanbalance,
      settlementdate
    })
    .single();
}

export async function udpateNilTrailReason(supabase, nilTrailReason, loanId) {
  // console.log('udpateNilTrailReason', nilTrailReason, loanId);
  return supabase
    .from('loans')
    .update({ niltrailreason: nilTrailReason })
    .eq('id', loanId);
}

export async function insertNilTrailReasonPassedToValidationFailed(
  supabase,
  record,
  batchId
) {
  const {
    accountno,
    lender,
    borrower,
    niltrailreason,
    loanbalance,
    loan,
    settlementdate
  } = record;

  return supabase
    .from('validationfailed')
    .insert({
      loanid: loan?.id,
      accountno,
      lender,
      borrower,
      batchid: batchId,
      niltrailreason,
      loanbalance,
      isresolved: true,
      settlementdate,
      resolvereason: 'nil trail reason - processed with file upload'
    })
    .single();
}

export async function insertFoundLoansUpfrontClawback(
  supabase,
  record,
  batchId
) {
  const { loan, upfrontcommission, gst, upfront_gst } = record;

  return supabase.from('monthlyloandata').insert({
    loanid: loan?.id,
    batchid: batchId,
    upfrontcommission,
    gst,
    upfront_gst
  });
}

//Insert Trail data for found loans into monthlyloandata table, only used for arthur mac but
// can be used for others too
export async function insertMonthlyTrailData(supabase, record, batchId) {
  console.log('insertMonthlyTrailData', record, batchId);
  const { loan, trailcommission, gst, loanbalance } = record;
  return supabase.from('monthlyloandata').insert({
    loanid: loan?.id,
    batchid: batchId,
    trailcommission,
    loanbalance,
    gst
  });
}

//Insert Trail data for not-found loans into validationfailed table
export async function insertValidationFailedTrail(supabase, record, batchId) {
  console.log('record insertValidationFailedTrail', record, batchId);
  const { accountno, lender, borrower, trailcommission, gst, loanbalance } =
    record;

  return supabase
    .from('validationfailed')
    .insert({
      accountno,
      loanbalance,
      lender,
      borrower,
      trailcommission,
      gst,
      batchid: batchId
    })
    .single();
}

//insert Trail data for found loans into validation failed, used for batch deletion
export async function insertFoundLoansToValidationFailed(
  supabase,
  record,
  batchId
) {
  console.log('insertFoundLoansToValidationFailed', record, batchId);
  const {
    accountno,
    lender,
    borrower,
    upfrontcommission,
    gst,
    loan,
    loanbalance
  } = record;

  return supabase
    .from('validationfailed')
    .insert({
      accountno,
      lender,
      borrower,
      loanbalance,
      upfrontcommission,
      gst,
      batchid: batchId,
      loanid: loan?.id
    })
    .single();
}

export async function insertNilTrailReasonMonthly(supabase, record, batchId) {
  console.log(' record, batchId', record, batchId);
  const { loan, loanbalance, niltrailreason, settlementdate } = record;
  console.log('insertNilTrailReasonMonthly', loan, loanbalance, niltrailreason);
  return supabase.from('monthlyloandata').insert({
    loanid: loan?.id,
    batchid: batchId,
    loanbalance,
    niltrailreason,
    settlementdate
  });
}

export async function updateUpfrontCommMonthlyData(
  supabase,
  loanid,
  batchid,
  upfrontcommission
) {
  console.log(
    'updateUpfrontCommMonthlyData',
    loanid,
    batchid,
    upfrontcommission
  );
  return supabase
    .from('monthlyloandata')
    .update({ upfrontcommission })
    .eq('loanid', loanid)
    .eq('batchid', batchid)
    .throwOnError();
}

export async function updateTrailReasonForFoundLoans(
  supabase,
  accountNo,
  batchId,
  loanId,
  nilTrailReason
) {
  return supabase
    .from('monthlyloandata')
    .insert({
      niltrailreason: nilTrailReason,
      loanid: loanId,
      batchid: batchId
    })
    .single();
}

export async function findLoanByAccountQuery(supabase, { accountno }) {
  console.log('findLoanByAccountQuery', accountno);
  return supabase
    .from('loans')
    .select('id, lender, status, borrower, lenderid')
    .eq('accountno', accountno)
    .single();
}
export async function findPartnerByEmailQuery(supabase, { email }) {
  return supabase
    .from('consultants')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();
}

export async function findLoanByAccountNo(supabase, accountNo) {
  return await supabase
    .from('loans')
    .select('*, lenders:lenders(name)')
    .eq('accountno', accountNo)
    .single();
}

export async function findLenderAliasesQuery(supabase, { lenderId }) {
  return supabase
    .from('lenderaliases')
    .select('alias')
    .eq('lenderid', lenderId);
}

export async function findLoanByIdQuery(supabase, loanId) {
  return supabase
    .from('loans')
    .select('accountno, status')
    .eq('id', loanId)
    .single();
}

export async function getAliases(supabase, lenderId) {
  return await supabase
    .from('lenderaliases')
    .select('alias')
    .eq('lenderid', lenderId)
    .throwOnError();
}

export async function deleteBatch(supabase, batchId) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const userId = session?.user.id;

  if (!userId) {
    return null;
  }

  return supabase.from('batch').delete().eq('id', batchId).throwOnError();
}

export async function getLoans(supabase) {
  return supabase.from('loans').select('*').eq('isexception', false);
}

export async function getPartnersQuery(supabase) {
  const { data, error } = await supabase
    .from('consultants')
    .select(
      `
      id,
      firstname,
      lastname,
      company
    `
    )
    .order('firstname');

  if (error) {
    throw error;
  }

  return {
    data: data?.map(({ id, firstname, lastname, company }) => ({
      id,
      name: `${firstname} ${lastname}`,
      entity: company
    }))
  };
}
export async function getDetailedPartnerInformationQuery(supabase) {
  return supabase
    .from('consultants')
    .select('*')
    .order('firstname')
    .throwOnError();
}

export async function getPartnerBankDetailsQuery(supabase) {
  return supabase
    .from('consultants')
    .select('id, accountname, bsb, bankaccountno')
    .throwOnError();
}

export async function getConsultantGroupQuery(supabase) {
  return supabase.from('consultantgroups').select('id, name');
}

export async function getLenders(supabase) {
  return supabase
    .from('lenders')
    .select('id, name')
    .eq('status', 'Current')
    .order('name')
    .throwOnError();
}

export async function getLenderAliases(supabase) {
  return supabase
    .from('lenderaliases')
    .select('*')
    .order('alias')
    .throwOnError();
}

export async function getLendersNoPayers(supabase) {
  // const {
  //   data: { session },
  // } = await supabase.auth.getSession();

  // const userId = session?.user.id;

  // if (!userId) {
  //   return null;
  // }

  return supabase
    .from('lenders')
    .select('id, name')
    .eq('status', 'Current')
    .eq('ispayer', false)
    .order('name')
    .throwOnError();
}

export async function getFinishedBatchStats(supabase, { batchId }) {
  return supabase
    .from('monthlyloandata')
    .select('*')
    .eq('batchid', batchId)
    .throwOnError();
}

export async function getProcssedRecordsForBatch(supabase, { batchId }) {
  console.log('getProcssedRecordsForBatch', batchId);
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const userId = session?.user.id;

  console.log('getProcssedRecordsForBatch userId', userId);

  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('monthlyloandata')
    .select(
      `
      *,
      loans(
        accountno,
        borrower,
        lender,
        loanamount,
        partner,
        consultants:partner(firstname, lastname, company)
      )
    `
    )
    .eq('batchid', batchId)
    .throwOnError();

  if (error) {
    throw error;
  }

  // Flatten the nested objects
  const flattenedData = data.map(record => ({
    loanid: record.loanid,
    trailcommission: record.trailcommission,
    gst: record.gst,
    upfrontcommission: record.upfrontcommission,
    upfront_gst: record.upfront_gst,
    accountno: record.loans.accountno,
    lender: record.loans.lender,
    borrower: record.loans.borrower,
    loanbalance: record.loans.loanamount,
    isresolved: true,
    partner:
      record.loans.consultants.firstname +
      ' ' +
      record.loans.consultants.lastname
  }));

  return flattenedData;
}

export async function getVaultQuery(supabase, params) {
  const { path } = params || {};
  const defaultFolders = path
    ? []
    : [
        { name: 'rctis', isFolder: true },
        { name: 'funders', isFolder: true }
      ];

  //ideally this will be when system will be used by multiple teams
  // let basePath = teamId;
  let basePath = 'mcp';

  if (path) {
    basePath = `${basePath}/${path}`;
  }

  console.log('basePath', basePath);

  const { data } = await supabase.storage.from('vault').list(basePath, {
    sortBy: { column: 'name', order: 'asc' }
  });

  console.log('data', data);

  const filteredData =
    data
      ?.filter(file => file.name !== EMPTY_FOLDER_PLACEHOLDER_FILE_NAME)
      .map(item => ({ ...item, isFolder: !item.id })) ?? [];

  console.log('filteredData', filteredData);

  const mergedMap = new Map(
    [...defaultFolders, ...filteredData].map(obj => [obj.name, obj])
  );

  console.log('mergedMap', mergedMap);

  const mergedArray = Array.from(mergedMap.values());

  console.log('mergedArray', mergedArray);
  return {
    data: mergedArray
  };
}

//This is to see recent activities
export async function getVaultActivityQuery(supabase) {
  // return supabase.storage.from('objects').list('*');
  return supabase
    .from('objects')
    .select('*')
    .limit(10)
    .order('created_at', { ascending: false });
}

export async function getVaultRecursiveQuery(supabase, params) {
  const { teamId, path, folder, limit = 10000 } = params;
  console.log('teamId, path, folder', teamId, path, folder);
  let basePath = teamId;

  if (path) {
    basePath = `${basePath}/${path}`;
  }

  if (folder) {
    basePath = `${basePath}/${folder}`;
  }

  const items = [];
  let folderContents = [];

  for (;;) {
    const { data } = await supabase.storage.from('vault').list(basePath);

    folderContents = folderContents.concat(data);
    // offset += limit;
    if ((data || []).length < limit) {
      break;
    }
  }

  const subfolders = folderContents?.filter(item => item.id === null) ?? [];
  const folderItems = folderContents?.filter(item => item.id !== null) ?? [];

  folderItems.forEach(item => items.push({ ...item, basePath }));

  const subFolderContents = await Promise.all(
    subfolders.map(folder =>
      getVaultRecursiveQuery(supabase, {
        ...params,
        folder: decodeURIComponent(folder.name)
      })
    )
  );

  subFolderContents.map(subfolderContent => {
    subfolderContent.map(item => items.push(item));
  });

  return items;
}

export async function getValidationFailedRecordsQuery(supabase, { batchId }) {
  console.log('fetching data getValidationFailedRecords**', batchId);
  return supabase
    .from('validationfailed')
    .select(
      `
      *,
      loan:loans(
        partner:consultants!loans_partner_fkey(
          id,
          firstname,
          lastname,
          company
        )
      )
    `
    )
    .eq('batchid', batchId)
    .limit(10000);
}
export async function getValidationFailedUnResolvedRecordsQuery(
  supabase,
  { batchId }
) {
  console.log('fetching data getValidationFailedRecords**', batchId);
  return supabase
    .from('validationfailed')
    .select('*')
    .eq('batchid', batchId)
    .eq('isresolved', false)
    .limit(10000);
}

export async function getLoanAndMonthlyData(supabase, { loanId }) {
  return supabase
    .from('loans')
    .select(
      `*, monthlyloandata(id, trailcommission, upfrontcommission, gst, upfront_gst, batchid, loanbalance, loanid),
        loanbrokers(consultantid, trailcommissionpct, upfrontcommissionpct, upfrontcommissionamt)`
    )
    .eq('id', loanId)
    .single();
}

export async function getRctiRecordsQuery(supabase, { month, year }) {
  return supabase
    .from('rcti_records')
    .select('partner_id, net_amount')
    .eq('month', month)
    .eq('year', year);
}

export async function getBusinessBankInfoQuery(supabase, { teamId }) {
  return supabase
    .from('settings')
    .select(
      `
    settings->>company_bsb,
    settings->>company_account_name,
    settings->>company_accountno
  `
    )
    .eq('team_id', teamId)
    .single();
}

export function getAbaRecordsQuery(supabase, { teamId }) {
  return supabase.from('aba_records').select('*').eq('team_id', teamId);
}

export function getDetailedRctiRecordsQuery(supabase) {
  return supabase.from('rcti_records').select(`
  *,
  consultants:partner_id (
    firstname,
    lastname
  )
`);
}

export function getLenderIdQuery(supabase, { lenderName }) {
  return supabase
    .from('lenders')
    .select('id')
    .eq('name', lenderName)
    .single()
    .throwOnError();
}

export function getLenderAliasByNameQuery(supabase, { aliasName }) {
  return supabase
    .from('lenderaliases')
    .select('lenderid')
    .eq('alias', aliasName)
    .single()
    .throwOnError();
}

export function getLenderByIdQuery(supabase, { lenderId }) {
  return supabase.from('lenders').select('name').eq('id', lenderId).single();
}

export function getRolesQuery(supabase) {
  return supabase.from('roles').select('id, name');
}

export function getRoutesQuery(supabase) {
  return supabase.from('routes').select('id, path');
}

export function getPermissionsQuery(supabase) {
  return supabase.from('permissions').select('id, entity, action');
}

export function getManualAdjustmentsQuery(
  supabase,
  { month, year, type } = {}
) {
  let query = supabase.from('manual_adjustments').select('*');

  if (month) {
    query = query.eq('month', month);
  }
  if (year) {
    query = query.eq('year', year);
  }
  if (type) {
    query = query.eq('type', type);
  }

  return query;
}

export async function getLenderAliasMappingQuery(supabase) {
  // Get all lenders and their aliases in parallel
  const [lendersResponse, aliasesResponse] = await Promise.all([
    supabase.from('lenders').select('id, name'),
    supabase.from('lenderaliases').select('lenderid, alias')
  ]);

  // Check for errors
  if (lendersResponse.error) throw lendersResponse.error;
  if (aliasesResponse.error) throw aliasesResponse.error;

  const { data: lenders } = lendersResponse;
  const { data: aliases } = aliasesResponse;

  // Create mapping of lenderId to aliases first for O(1) lookup
  const lenderIdToAliases = aliases.reduce((acc, alias) => {
    if (!acc[alias.lenderid]) {
      acc[alias.lenderid] = [];
    }
    acc[alias.lenderid].push(alias.alias);
    return acc;
  }, {});

  // Create final mapping of lender name to array of aliases
  const lenderAliasMapping = lenders.reduce((acc, lender) => {
    const lenderAliases = lenderIdToAliases[lender.id] || [];
    if (lenderAliases.length > 0) {
      acc[lender.name] = lenderAliases;
    }
    return acc;
  }, {});

  return lenderAliasMapping;
}

export function getAllFulfilmentCostsQuery(supabase) {
  return supabase.from('fulfilment_costs').select('*');
}

export function getAllOtherCostsQuery(supabase) {
  return supabase.from('other_costs').select('*');
}

export function getRoleAllowedRoutesQuery(supabase) {
  return supabase.from('role_allowed_routes').select('role_id, route_id');
}

export function getRoleAllowedPermissionsQuery(supabase) {
  return supabase
    .from('role_allowed_permissions')
    .select('role_id, permission_id');
}

export function getDetailedRctiRecordsForMonthQuery(supabase, { month, year }) {
  return supabase
    .from('rcti_records')
    .select('*')
    .eq('month', month)
    .eq('year', year);
}

export async function getMultiEntityRatesQuery(supabase) {
  // Fetch all historical data in parallel
  const [partnersHistory, adminFeesHistory, lendersHistory, loansHistory] =
    await Promise.all([
      supabase
        .from('partners_history')
        .select(
          `
        id,
        partner_id,
        defaulttrail,
        defaultupfront,
        valid_from,
        valid_to,
        consultants:partner_id (
          firstname,
          lastname
        )
      `
        )
        .order('valid_from', { ascending: true }),

      supabase
        .from('admin_fees_charge_history')
        .select(
          `
        id,
        admin_fee_id,
        charge,
        valid_from,
        valid_to
      `
        )
        .order('valid_from', { ascending: true }),

      supabase
        .from('lenders_trail_rate_history')
        .select(
          `
        id,
        lender_id,
        trailrate,
        valid_from,
        valid_to,
        lenders:lender_id (
          name
        )
      `
        )
        .order('valid_from', { ascending: true }),

      supabase
        .from('loans_rate_history')
        .select(
          `
        id,
        loan_id,
        expirydate,
        discountrate,
        loans:loan_id (
          accountno,
          borrower
        ),
        valid_from,
        valid_to
      `
        )
        .order('valid_from', { ascending: true })
    ]);

  // Check for errors
  if (partnersHistory.error) throw partnersHistory.error;
  if (adminFeesHistory.error) throw adminFeesHistory.error;
  if (lendersHistory.error) throw lendersHistory.error;
  if (loansHistory.error) throw loansHistory.error;

  // Transform partnersHistory to include name outside consultants
  const transformedPartnersHistory = partnersHistory.data.map(
    ({ consultants, ...partner }) => ({
      ...partner,
      name: `${consultants.firstname} ${consultants.lastname}`
    })
  );

  const transformedLendersHistory = lendersHistory.data.map(
    ({ lenders, ...lender }) => ({
      ...lender,
      name: lenders.name
    })
  );

  const transformedLoansHistory = loansHistory.data.map(
    ({ loans, ...loan }) => ({
      ...loan,
      accountno: loans.accountno,
      borrower: loans.borrower
    })
  );

  console.log('transformedPartnersHistory', transformedPartnersHistory);
  console.log('adminFeesHistory', adminFeesHistory?.data);
  console.log('lendersHistory', lendersHistory?.data);
  console.log('loansHistory', transformedLoansHistory);
  return {
    partners: transformedPartnersHistory || [],
    adminFees: adminFeesHistory?.data || [],
    lenders: transformedLendersHistory || [],
    loans: transformedLoansHistory || []
  };
}

export async function getPartnersForAdminFeeQuery(supabase, { adminFeeId }) {
  return supabase
    .from('partner_admin_fees')
    .select('*')
    .eq('admin_fee_id', adminFeeId)
    .throwOnError();
}
