import { StringLiteralLike } from "typescript"

export interface FormDetailInfo {
    title: string,
    type: string,
    json: any,
}

export interface FormInfo
{
    message: string | undefined ;
    form: FormDetailInfo | undefined ;
    reversed: boolean | undefined ;
    color: string | undefined ;
}
