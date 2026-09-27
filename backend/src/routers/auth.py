"""
Router para Autenticação e Gestão de Usuários (Master criando logins).
"""

import uuid
from typing import List
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models import Usuario
from src.services.auth import (
    verify_password, get_password_hash, create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user, get_current_master_user
)
from datetime import timedelta

router = APIRouter(prefix="/api/auth", tags=["Auth & Gestão de Acessos"])

class UserCreate(BaseModel):
    nome: str
    email: str
    senha: str
    is_master: bool = False

class UserResponse(BaseModel):
    id: uuid.UUID
    nome: str
    email: str
    is_master: bool
    is_active: bool

    class Config:
        from_attributes = True

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.email == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": "master" if user.is_master else "student"},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": user.id, "nome": user.nome, "is_master": user.is_master}}


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: Usuario = Depends(get_current_user)):
    return current_user


# ==============================================================================
# PAINEL MASTER - CRIAÇÃO E LISTAGEM DE OUTROS USUÁRIOS
# ==============================================================================

@router.post("/users", response_model=UserResponse)
async def create_user(
    user_in: UserCreate, 
    db: AsyncSession = Depends(get_db), 
    master: Usuario = Depends(get_current_master_user)
):
    """(Apenas Master): Cria novas contas de acesso para outros alunos."""
    # Verifica se já existe
    result = await db.execute(select(Usuario).where(Usuario.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Este email já está cadastrado.")
    
    new_user = Usuario(
        id=uuid.uuid4(),
        nome=user_in.nome,
        email=user_in.email,
        senha_hash=get_password_hash(user_in.senha),
        is_master=user_in.is_master
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    master: Usuario = Depends(get_current_master_user)
):
    """(Apenas Master): Lista todas as contas de acesso criadas."""
    result = await db.execute(select(Usuario).order_by(Usuario.criado_em.desc()))
    return result.scalars().all()


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    master: Usuario = Depends(get_current_master_user)
):
    """(Apenas Master): Remove o acesso de um usuário."""
    if user_id == master.id:
        raise HTTPException(status_code=400, detail="Você não pode deletar a si mesmo.")
        
    result = await db.execute(select(Usuario).where(Usuario.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    
    await db.delete(user)
    await db.commit()
    return {"status": "Acesso revogado com sucesso"}
