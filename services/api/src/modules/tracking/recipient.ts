import type {DB,Row} from '../../platform/db/index.ts';
import {requireCondition} from '../../platform/security.ts';
import {iso} from '../common.ts';
import {validGrant} from './index.ts';

// Native recipients use their verified identity, never the owner's SOS endpoint or a public ID.
export async function recipientGrant(db:DB,user:Row,grantId:string){
 const r=await db.query('SELECT g.* FROM tracking_grants g JOIN emergency_contacts c ON c.id=g.contact_id WHERE g.id=$1 AND c.principal_id=$2 AND c.phone_e164=$3',[grantId,user.id,user.phone_e164]);
 requireCondition(r.rowCount,404,'NOT_FOUND');
 await validGrant(db,r.rows[0]);
 return r.rows[0];
}
export async function receivedAlerts(db:DB,user:Row){
 const r=await db.query(`SELECT g.id,g.kind,g.expires_at,u.display_name,
 COALESCE(e.created_at,j.started_at) AS started_at,r.acknowledgement AS own_acknowledgement
 FROM tracking_grants g JOIN emergency_contacts c ON c.id=g.contact_id
 JOIN app_users u ON u.id=c.owner_user_id
 LEFT JOIN sos_events e ON e.id=g.sos_event_id LEFT JOIN journeys j ON j.id=g.journey_id
 LEFT JOIN sos_recipients r ON r.id=g.recipient_id
 WHERE c.principal_id=$1 AND c.phone_e164=$2 AND c.invite_status='VERIFIED' AND c.revoked_at IS NULL
 AND g.revoked_at IS NULL AND g.expires_at>now()
 AND ((e.id IS NOT NULL AND e.status NOT IN ('RESOLVED','CANCELLED') AND e.expires_at>now())
 OR (j.id IS NOT NULL AND j.status IN ('ACTIVE','OVERDUE') AND j.share_with_contacts AND j.expires_at>now()))
 ORDER BY COALESCE(e.created_at,j.started_at) DESC,g.id DESC LIMIT 100`,[user.id,user.phone_e164]);
 return {items:r.rows.map(g=>({grant_id:g.id,kind:g.kind,shared_name:g.display_name,started_at:iso(g.started_at),expires_at:iso(g.expires_at),own_acknowledgement:g.own_acknowledgement??null})),next_cursor:null};
}
