export interface ProfileFormData {
  title: string;
  bio: string;
}

interface ProfileLike {
  id: string;
  title?: string | null;
  bio?: string | null;
}

export const getNextProfileFormState = (
  formData: ProfileFormData,
  hydratedUserId: string | null,
  user: ProfileLike | null
) => {
  if (!user) {
    return { formData, hydratedUserId };
  }

  if (hydratedUserId !== user.id) {
    return {
      formData: {
        title: user.title || '',
        bio: user.bio || '',
      },
      hydratedUserId: user.id,
    };
  }

  return { formData, hydratedUserId };
};
