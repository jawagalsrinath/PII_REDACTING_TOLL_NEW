import { checkPoilicies } from './checkPolicies';

export default async function handlePDFIntercept(payload){
    const decision = await checkPoilicies(payload); // check the policies , if approved : proceed with the file.
    return decision ? { action : 'SHOW_MODAL'} : { action : 'BLOCK'} ;
}
 