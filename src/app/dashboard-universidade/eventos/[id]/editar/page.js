"use client";
import { useParams } from "next/navigation";
import FormularioEvento from "../../FormularioEvento";

export default function EditarEvento() {
    const params = useParams();
    const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
    if (!id) return null;
    return <FormularioEvento eventoId={id} />;
}
